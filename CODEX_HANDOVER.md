# Poster Studio — Comprehensive Code Handover for OpenAI Codex Agents

This document is a deep, file-by-file walkthrough of every part of the Poster Studio codebase. It is written specifically for an autonomous coding agent (e.g. OpenAI Codex) that has no prior knowledge of the project. Read this together with `CLAUDE.md` (operational rules / known gotchas) and `HANDOVER.md` (failure modes + business context). Where those two documents focus on *what to avoid*, this one focuses on *what each piece of code is and why it exists*.

> Last updated: 2026-04-28
> Scope: the entire repo at `/home/dev/poster-studio`
> Audience: AI coding agents performing implementation, refactoring, debugging.

---

## Table of Contents

1. [Project at a Glance](#1-project-at-a-glance)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Repository Layout](#4-repository-layout)
5. [The Three Poster Modes](#5-the-three-poster-modes)
6. [Frontend State (Zustand store)](#6-frontend-state-zustand-store)
7. [Routing & Page Components](#7-routing--page-components)
8. [Core Components — Deep Dive](#8-core-components--deep-dive)
9. [Sidebar Panels](#9-sidebar-panels)
10. [Utilities](#10-utilities)
11. [Hooks & Helpers](#11-hooks--helpers)
12. [Admin Panel](#12-admin-panel)
13. [Backend Server](#13-backend-server)
14. [Database Schema](#14-database-schema)
15. [Render Pipeline](#15-render-pipeline)
16. [Etsy Integration](#16-etsy-integration)
17. [Listing System](#17-listing-system)
18. [Font System](#18-font-system)
19. [Map System](#19-map-system)
20. [Build, Test, Deploy](#20-build-test-deploy)
21. [Scripts](#21-scripts)
22. [Common Tasks Cookbook](#22-common-tasks-cookbook)
23. [Glossary](#23-glossary)
24. [Session Learnings — Debugging Stories & Architectural Decisions](#24-session-learnings--debugging-stories--architectural-decisions)

---

## 1. Project at a Glance

**Poster Studio** (product name: *The Mapped Moment*) is a customer-facing web application that lets users design personalized printable posters. The user picks a design template, customizes text/colors/layout in a live SVG preview, and either downloads a watermarked PNG (free demo) or completes a purchase via Etsy to receive a 300-DPI PNG download or a physical print.

There are **three poster modes** sharing the same renderer:

| Mode | Source data | Description |
|------|------------|-------------|
| `starmap` | d3-celestial JSON (CDN) | Astronomically accurate star chart for a given lat/lng/date/time |
| `streetmap` | OpenFreeMap vector tiles via MapLibre | 2-color custom-styled city street map |
| `coloredmap` | OpenFreeMap "Bright" prebuilt style | Realistic colored street map with heritage POI filter |

Every poster has the same structural elements: an outer rectangle (the print area), a clipped shape inside (`circle | heart | house | rect`) that contains the star map or street map, a series of text rows below it (title, subtitle, dedication, names, divider, location/date/coords), and optional decorations (frame, inner ring, outer ring, decorative heart).

**Business model:** customer pays via Etsy → backend verifies the order via Etsy API → renders the PNG → emails the download link. Physical fulfillment is planned via Prodigi but not yet wired up.

---

## 2. Tech Stack & Dependencies

### Frontend
- **React 19** — function components, hooks. Zero class components.
- **Vite 7** — dev server + production bundler. Vite-specific `?url` imports are used for font loading (see §18).
- **TypeScript** — strict mode disabled but type errors fail the build. Some files use `any` pragmatically (D3 typings are awkward).
- **Chakra UI v2** — base UI primitives: `Box`, `VStack`, `Slider`, `Accordion`, etc. Theme is essentially default.
- **Tailwind CSS 4** — used for utility classes in some places (mainly mobile responsive hacks).
- **Zustand v5** — single global store at `src/store/useStore.ts`. ~900 lines, ~150 fields. No middleware, no devtools, no persistence library — undo/redo and autosave are hand-rolled subscriptions.
- **D3** (`d3-geo`, `d3-selection`, `d3-scale`, `d3-drag`) — used only by `VectorStarMap.tsx` for star projection, drag handles, and SVG manipulation. No `d3` umbrella import — modules are imported individually for tree-shaking.
- **MapLibre GL JS v5** — used only by `StreetMapCapture.tsx` for offscreen WebGL street-map rendering. Lazy-loaded so star-map users don't pay the ~200 KB bundle cost.
- **react-router-dom** — page routing.
- **date-fns** — date formatting on the poster.
- **fontsource** — bundled web fonts (~30 families). Source files live in `src/assets/fonts/`. Each is also registered in `src/utils/fontRegistry.ts` with a Vite `?url` import for the render pipeline.
- **jsPDF** — lazy-imported for PDF export (admin only — PDF was removed from the customer-facing demo download).

### Backend
- **Node 20 + Express 5** — `server/index.js` is the single entry. Top-level `await` is used for dynamic imports.
- **better-sqlite3** — synchronous SQLite driver. WAL mode is enabled in `server/db.js`.
- **bcrypt + jsonwebtoken** — admin authentication (`server/middleware/auth.js`).
- **node-cron** — daily seller digest at 8 AM, Etsy poll every 2 minutes.
- **nodemailer** — transactional email (poster-ready notifications, daily digests).
- **multer** — file uploads for the admin asset manager.
- **helmet, cors, express-rate-limit, morgan** — standard Express hardening + logging.
- **puppeteer** (optional) — server-side PNG rendering when `ENABLE_LOCAL_RENDER=true`.

### Infrastructure
- AWS EC2 t3.micro (Sydney, ap-southeast-2), Ubuntu 24.04, public IP `3.107.34.169`, domain `themappedmoment.com`.
- Nginx on port 80/443 → reverse proxies `/api/*` to `localhost:3001` and serves `/var/www/poster-studio/` as the static frontend.
- Systemd unit `poster-studio-api.service` runs `node server/index.js`.
- Let's Encrypt SSL cert auto-renewing.
- SQLite DB lives at `/home/ubuntu/poster-studio/server/data/db.sqlite`.

### Testing
- **Playwright** — end-to-end browser tests. ~400 tests across 11 files in `tests/`.
- **Vitest** — unit tests for utility functions (e.g. `applyTemplate.test.ts`).
- All Playwright tests use `tests/fixtures/mockApi.ts` to intercept `/api/**` and avoid hitting the real backend.

---

## 3. High-Level Architecture

```
┌──────────────────────── BROWSER ─────────────────────────┐
│                                                           │
│  React App (Vite-built SPA)                               │
│    ├─ MainLayout (split pane: preview + sidebar)          │
│    │    ├─ VectorStarMap   (renders SVG poster)           │
│    │    ├─ StreetMapCapture (offscreen MapLibre WebGL)    │
│    │    └─ SidebarControls (all design controls)          │
│    ├─ ListingPage (collection page at /l/:slug)           │
│    ├─ VerifyOrder (purchase flow at /verify)              │
│    └─ /admin/* (admin panel)                              │
│                                                           │
│  Single Zustand store  ◄── all state, undo/redo, autosave │
└─────────────┬─────────────────────────────────────────────┘
              │ HTTPS — only on /verify and admin pages
              │ (the designer is fully client-side)
              ▼
┌─────────────────────── EXPRESS API ──────────────────────┐
│                                                           │
│  Public routes:                                           │
│    POST /api/save-design        save a design token       │
│    GET  /api/design/:token      load a saved design       │
│    POST /api/verify-order       verify Etsy receipt       │
│    GET  /api/order-status       poll render progress      │
│    GET  /api/download-file/:id  signed download URL       │
│    GET  /api/templates          public template list      │
│    GET  /api/templates/:id      single template settings  │
│    GET  /api/listings/:slug     listing + its templates   │
│    POST /api/events             analytics ingest          │
│                                                           │
│  Admin routes (JWT-required):                             │
│    /api/admin/orders            order CRUD + bulk + CSV   │
│    /api/admin/listings          listing CRUD              │
│    /api/admin/templates         template CRUD + style sync│
│    /api/admin/etsy/*            Etsy proxy + listing sync │
│    /api/admin/assets            font/image upload         │
│    /api/admin/settings          global settings           │
│                                                           │
│  Background jobs:                                         │
│    - Render queue worker (continuous, one job at a time)  │
│    - Etsy poll (every 2 min, only if creds present)       │
│    - Daily seller digest (8 AM cron)                      │
└────────┬───────────────────────────────────────┬─────────┘
         │                                       │
   SQLite DB                          External services:
   (WAL mode)                            - Etsy API v3 (OAuth)
                                         - Nominatim (geocoding)
                                         - OpenFreeMap (vector tiles)
                                         - d3-celestial (star data)
                                         - Prodigi/Printify (planned)
                                         - Render Lambda (optional)
                                         - SMTP server (Mailgun/etc.)
```

### Data Flow Examples

**A) User customizes a poster:**
1. User drags a slider in `SidebarControls`.
2. Slider's `onChange` calls a Zustand setter (e.g. `setTitleFontSize(48)`).
3. Zustand updates the field in the global state.
4. `VectorStarMap`'s `useEffect` (which lists that field in its dep array) re-runs.
5. D3 mutates the SVG DOM in place; the user sees the change.
6. A separate Zustand subscriber (in `useStore.ts`) detects the change and pushes an undo snapshot after a 400 ms debounce.
7. A second subscriber serializes the design state to `localStorage` after a 2 s debounce (autosave).

**B) User opens `/l/star-map-night-we-met`:**
1. React Router calls `MainLayout`.
2. `MainLayout` sees the `:slug` URL param, fetches `/api/listings/star-map-night-we-met`.
3. The backend returns the listing row + all linked templates (via `listing_templates` join).
4. `MainLayout` groups templates by `design_group_id`, builds `DesignGroup[]`, picks the first design's 8x10 template, and calls `fetchAndApplyTemplate(templateId)`.
5. `fetchAndApplyTemplate` GETs `/api/templates/:id`, calls `applyTemplate(settings)` which dumps the settings into the Zustand store.
6. Store update triggers `VectorStarMap` re-render → user sees the loaded design.

**C) User changes the map zoom:**
1. Slider moves → `setMapZoom(8.2)` → store update.
2. `StreetMapCapture`'s coordinate `useEffect` fires → calls `map.jumpTo({ zoom: 8.2 })`.
3. MapLibre fires `moveend` → handler runs `captureQuick()` (instant 800 px JPEG) and schedules `captureStitched()` for 1.2 s later.
4. `onCapture(dataUrl)` is called → updates `mapBackgroundImage` in the store → `VectorStarMap` re-renders the `<image>` href → user sees the new map.

---

## 4. Repository Layout

```
poster-studio/
├── CLAUDE.md                  # Operational notes for Claude/AI agents
├── HANDOVER.md                # Failure-mode focused handover (read first)
├── CODEX_HANDOVER.md          # ← this document
├── PLAN.md                    # Roadmap, phases, A/B testing plan
├── DEPLOYMENT.md              # Brief deployment notes
├── README.md                  # Public-facing overview
├── SESSION_HANDOVER.md        # In-progress session notes (auto-generated)
├── TESTING-AND-IMPROVEMENTS.md# Testing notes
├── eslint.config.js           # ESLint flat config (TS rules)
├── postcss.config.js          # PostCSS for Tailwind
├── tailwind.config.js         # Tailwind config (mostly default)
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── vite.config.ts             # Vite build config
├── vitest.config.ts           # Vitest config
├── playwright.config.ts       # Playwright config
├── package.json               # Frontend deps + npm scripts
├── package-lock.json
├── index.html                 # Vite entry HTML
├── house.svg                  # Reference SVG path for the house mask shape
├── download_fonts.js          # One-shot script to fetch fontsource woff2 files
│
├── src/                       # Frontend source
│   ├── main.tsx               # React root, ChakraProvider, router setup
│   ├── App.tsx                # Routes + lazy-loaded admin pages
│   ├── index.css              # Global styles + Tailwind directives
│   │
│   ├── components/            # All UI components
│   │   ├── MainLayout.tsx       # Designer page (preview + sidebar split)
│   │   ├── VectorStarMap.tsx    # SVG poster renderer (the core)
│   │   ├── StreetMapCapture.tsx # Offscreen MapLibre renderer
│   │   ├── SidebarControls.tsx  # Sidebar wrapper + accordion
│   │   ├── DownloadButton.tsx   # PNG/PDF download flow
│   │   ├── CitySearch.tsx       # Nominatim autocomplete
│   │   ├── GlyphPicker.tsx      # Glyph browser for the script font
│   │   ├── TemplateSelector.tsx # Template grid in the designer (legacy)
│   │   ├── ListingPage.tsx      # /l/:slug listing collection page
│   │   ├── PosterRenderPage.tsx # /render/:token printable view (server use)
│   │   ├── VerifyOrder.tsx      # /verify customer purchase flow
│   │   ├── GalleryPage.tsx      # /gallery template gallery
│   │   ├── PrivacyPolicy.tsx    # /privacy
│   │   ├── ErrorBoundary.tsx    # React error boundary
│   │   ├── WelcomeModal.tsx     # First-time visitor modal
│   │   ├── mapPresets.ts        # Public color presets (no MapLibre import)
│   │   └── sidebar/
│   │       ├── TextContentPanel.tsx
│   │       ├── TypographyPanel.tsx
│   │       ├── MapControlsPanel.tsx
│   │       ├── ColorPanel.tsx
│   │       ├── StylePanel.tsx
│   │       └── sidebarStyles.ts
│   │
│   ├── store/
│   │   └── useStore.ts        # Zustand store (~900 lines)
│   │
│   ├── utils/
│   │   ├── astronomy.ts       # Lat/lng/date → projection rotation
│   │   ├── geocode.ts         # Nominatim wrapper + zoomFromBbox
│   │   ├── applyTemplate.ts   # Apply settings_json to the store
│   │   ├── applyTemplate.test.ts  # Vitest unit tests
│   │   ├── renderPoster.ts    # SVG → PNG/PDF blob with embedded fonts
│   │   ├── fontRegistry.ts    # Vite ?url imports for every woff2
│   │   └── analytics.ts       # POST /api/events helper
│   │
│   ├── hooks/
│   │   └── useDebounce.ts     # 25-line generic debounce hook
│   │
│   ├── types/
│   │   └── listing.ts         # DesignGroup interface
│   │
│   ├── admin/                 # Admin SPA pages (route-prefixed /admin)
│   │   ├── adminApi.ts          # JWT-aware fetch wrapper
│   │   ├── AdminLayout.tsx      # Admin-side nav + outlet
│   │   ├── AdminLogin.tsx       # /admin/login
│   │   ├── DashboardPage.tsx    # Revenue panel + stats
│   │   ├── OrdersPage.tsx       # Order list + bulk actions + CSV
│   │   ├── OrderDetailPage.tsx  # Single order view
│   │   ├── QueuePage.tsx        # Render queue status
│   │   ├── TemplatesPage.tsx    # Template grid CRUD
│   │   ├── TemplateEditorPage.tsx # Single template editor
│   │   ├── ListingsPage.tsx     # Listing CRUD + collection editor
│   │   ├── ListingDesignsPage.tsx # Drag-to-reorder design groups
│   │   ├── DesignEditorPage.tsx # Edit base settings of a design group
│   │   ├── DesignImportPage.tsx # Bulk import templates from a JSON file
│   │   ├── EtsyPage.tsx         # Etsy listing sync UI
│   │   ├── AnalyticsPage.tsx    # Event log viewer
│   │   ├── AssetsPage.tsx       # Image/font upload
│   │   └── SettingsPage.tsx     # Global settings
│   │
│   └── assets/
│       ├── fonts/             # ~30 woff2 files + fonts.css
│       └── images/            # Static images
│
├── server/                    # Express backend
│   ├── index.js               # Entry: middleware, route mount, cron
│   ├── db.js                  # Schema + migrations + initial seeds
│   ├── credentials.js         # Loads .env-based secrets
│   ├── middleware/
│   │   ├── auth.js              # JWT login + requireAdmin middleware
│   │   └── validate.js          # Zod-style request validation
│   ├── routes/
│   │   ├── designs.js           # Save/load designs
│   │   ├── verify.js            # Etsy order verification
│   │   ├── download.js          # Signed download URLs
│   │   ├── templates.js         # Template CRUD + listing sync
│   │   ├── listings.js          # Listing CRUD + listing_templates
│   │   ├── auth.js              # Etsy OAuth PKCE
│   │   ├── webhooks.js          # Printify webhook receiver
│   │   ├── analytics.js         # Event log
│   │   ├── admin-orders.js      # Admin order management
│   │   ├── admin-settings.js    # Admin settings + email + fulfillment providers
│   │   ├── admin-assets.js      # Admin asset upload
│   │   └── admin-etsy.js        # Admin Etsy sync controls
│   ├── services/
│   │   ├── etsy.js              # Etsy API client w/ auto token refresh
│   │   ├── render.js            # Render dispatcher (Lambda → Puppeteer → manual)
│   │   ├── renderLocal.js       # Puppeteer-based local renderer
│   │   ├── renderQueue.js       # SQLite-backed render job queue
│   │   ├── printify.js          # Printify API stub
│   │   └── email.js             # Nodemailer + daily digest
│   ├── data/                  # Created at runtime
│   │   ├── db.sqlite          # SQLite database
│   │   ├── renders/           # Generated PNG/PDF outputs
│   │   └── uploads/           # Admin uploads (assets)
│   ├── nginx.conf, nginx-api-proxy.conf  # Reference configs (not deployed)
│   ├── .env.example, .env (gitignored)
│   └── package.json
│
├── public/                    # Static files served by Vite
│   ├── designs/               # Design thumbnails (per design group)
│   │   └── SM001/Design001/8x10.png  ← (e.g.)
│   ├── fonts/                 # Public-served fonts (separate from src/assets/fonts)
│   ├── tile-sw.js             # Service worker for MapLibre tile caching
│   └── ...
│
├── scripts/
│   ├── sync-listing-state.cjs # Single source of truth for DB state (CRITICAL)
│   ├── seed-new-listings.cjs  # Insert new listings + design groups + templates
│   ├── verify-listing.cjs     # Playwright-based listing visual verification
│   └── test-font-render.cjs   # Verify fonts embed correctly in PNG renders
│
├── tests/                     # Playwright + Vitest test suites
│   ├── *.test.ts              # ~11 test files (~400 tests)
│   ├── fixtures/
│   │   └── mockApi.ts         # /api/** route interception
│   ├── snapshots/             # Visual regression baselines
│   └── report/                # HTML test report output
│
├── capture-thumbnails.cjs     # Capture poster thumbnails via Playwright
├── capture-map-debug*.cjs     # One-off debugging scripts
├── screenshot.cjs/.js         # Misc screenshot scripts
└── dist/                      # Production build output (gitignored)
```

---

## 5. The Three Poster Modes

`posterType` in the store is the master switch. It is `'starmap' | 'streetmap' | 'coloredmap'`.

### A) `starmap`
- `mapBackgroundImage` is **null**.
- `VectorStarMap` fetches star + constellation JSON from the d3-celestial GitHub raw CDN (cached in component state).
- D3 projects stars using a stereographic projection rotated by RA/Dec computed from `lat`, `lng`, `date`, `time`.
- All stars/constellations rendered as SVG `<circle>` and `<path>` elements.
- `<StreetMapCapture>` is **not mounted** because `MainLayout` checks `posterType !== 'starmap'` before rendering it.

### B) `streetmap`
- `mapStyleUrl` is **null** — uses the custom 2-color `createMapStyle(bgColor, streetColor)` builder.
- `<StreetMapCapture>` is mounted offscreen (fixed at top: -9999px). MapLibre renders into a 1200×1200 WebGL canvas.
- On `idle`/`moveend`, the canvas contents are read into a `<canvas>` and exported as a JPEG data URL via `captureStitched` (4-tile zoom+1 stitch) or `captureQuick` (instant 800 px single-tile downscale).
- The data URL is sent to `MainLayout.handleMapCapture(dataUrl)` → `setMapBackgroundImage(dataUrl)` in the store.
- `VectorStarMap` detects `mapBackgroundImage !== null` and renders an `<image href="data:...">` inside the clip shape.

### C) `coloredmap`
- `mapStyleUrl` is set to `https://tiles.openfreemap.org/styles/bright`.
- `<StreetMapCapture>` initializes MapLibre with that prebuilt style.
- After style loads, `applyHeritagePOIFilter()` mutates every `poi` layer to show only heritage subclasses (museums, historic, religion, viewpoint, etc.) — business POIs are hidden.
- Same capture pipeline as `streetmap`.

### Why one renderer for all three?
Sharing `VectorStarMap` for all modes means text/border/frame logic is implemented once. The only difference is whether the inner content is "stars" or "an `<image>` element" — that branch is at line 367 of `VectorStarMap.tsx`.

---

## 6. Frontend State (Zustand store)

File: `src/store/useStore.ts` (~900 lines).

### State Shape Categories

The store is essentially a flat record of ~150 fields. It has **no slices, no namespacing** — every field is top-level. Think of it as a giant React-style state object.

| Category | Example fields | Notes |
|----------|---------------|-------|
| Core data | `title`, `subtitle`, `date`, `lat`, `lng`, `location` | Star map content |
| Style | `posterColor`, `textColor`, `starColor`, `mapInteriorColor`, `designStyle` | Colors & visual style |
| Frame | `showFrame`, `frameInset`, `frameWidth` | Outer rectangle frame |
| Shape | `maskShape`, `circleSize`, `heartSize`, `houseSize`, `shapeOffsetX/Y`, `shapeOutlineWidth` | The clip shape inside the poster |
| Rings | `showInnerRing`, `innerRingWidth`, `innerRingInset`, `showOuterRing`, `outerRingWidth`, `outerRingGap` | Decorative concentric rings |
| Text rows | `titleFontSize`, `titleOffsetX`, `titleOffsetY`, `titleKerning`, `titleAllCaps`, `titleFont` (and same for `subtitle`, `details`, `dedication`, `names`) | Each text row has 5 typography knobs |
| Visibility | `showTitle`, `showLocation`, `showDate`, `showCoords`, `showDivider`, `showVertSep`, `showNames`, `showHeartDecor`, `showLocationPin` | Independent toggles |
| Custom text | `customText: { title, subtitle, date, location, coords, dedication, names }` | User-typed overrides for each text row |
| Print | `printSize: { label, width, height, ratio }` | One of 22 print sizes (see `PRINT_SIZE_MAP`) |
| Map | `posterType`, `mapCity`, `mapCenterLat`, `mapCenterLng`, `mapZoom`, `mapBearing`, `mapBgColor`, `mapStreetColor`, `mapColorPreset`, `mapStyleUrl`, `mapBackgroundImage`, `mapImageOffsetX/Y`, `mapImageOpacity` | Street/colored map state |
| Pin | `showLocationPin`, `locationPinSize`, `locationPinOffsetX/Y` | Red heart pin on map |
| Preview | `previewZoom`, `previewPanX/Y`, `isInlineEditing`, `activeTypoField` | UI-only state (not in `DESIGN_FIELDS`) |
| Template | `selectedTemplate`, `templateSettings`, `activeDesignGroupId` | Template system |
| Capture | `captureHighResFn`, `isDraggingMapImage` | Cross-component refs |
| History | `_historyPast`, `_historyFuture`, `_isUndoRedo`, `canUndo`, `canRedo` | Undo/redo |

### `DESIGN_FIELDS` (line 8-31)

This array is **the whitelist of fields that count as "design"**. Anything in here:
- Goes into undo/redo snapshots.
- Goes into autosave to `localStorage`.
- Goes into share-link encoding (`?d=`).
- Goes into template `settings_json`.

Things that are **excluded** (intentionally): `previewZoom`, `previewPanX/Y`, `isInlineEditing`, `templateSettings`, `_history*`, `mapBackgroundImage` (because it's a transient capture, not user input — but it IS in DESIGN_FIELDS for historical reasons; check before changing), `captureHighResFn`.

When you add a new design field, **you must add it to `DESIGN_FIELDS`** or it will not undo, autosave, share, or template-save correctly.

### Setters

Every field has an explicit setter. There is no generic `setState`. This is intentional — it keeps types clean and makes find-references trivial.

```ts
setTitle: (title) => set({ title }),
setMapZoom: (mapZoom) => set({ mapZoom }),
setCustomText: (key, value) => set(state => ({
    customText: { ...state.customText, [key]: value }
})),
```

### `setPosterType` is special (line ~700)

It does more than just set the field — it also manages side-effects:
- Switching to `coloredmap` → sets `mapStyleUrl = 'https://tiles.openfreemap.org/styles/bright'`.
- Switching to `streetmap` → sets `mapStyleUrl = null`.
- Switching to `starmap` → sets `mapBackgroundImage = null` (clears stale capture).
- May also rescale font sizes or shape positions.

Always call `setPosterType()` rather than `set({ posterType })` directly.

### `setPrintSize` is also special (line ~720)

It scales every font size and offset proportionally so the design looks the same at the new aspect ratio. The scaling factor is the ratio of the new height to the old height. **Do not** set `printSize` directly — always go through this setter.

### Undo/Redo (line 800+)

Implementation:
- A Zustand `subscribe()` callback (line 861) watches every state change.
- If any `DESIGN_FIELDS` field changed and `_isUndoRedo` is false, the old state is captured into `_pendingSnapshot` (only on the **first** change of a batch).
- A 400 ms debounce timer fires → pushes `_pendingSnapshot` onto `_historyPast` and clears `_historyFuture`.
- `undo()` pops from `_historyPast`, pushes current state to `_historyFuture`, sets `_isUndoRedo = true` (so the subscriber doesn't re-capture).
- After the next tick, `_isUndoRedo` is reset to false.

`MAX_HISTORY = 30` — older snapshots are dropped from both ends.

### Autosave (line 894+)

A second `subscribe()` callback writes a snapshot to `localStorage` under key `poster_studio_autosave` after a 2 s debounce. The snapshot includes `{ ts: Date.now(), state }`. On `MainLayout` mount, if a snapshot exists and is < 7 days old, the user is prompted to restore it. Date objects are serialized to ISO strings.

### Template Settings vs Defaults

There are two parallel mechanisms for saving design state:

- `saveTemplateSettings(templateId)` → snapshots a curated subset of fields into `state.templateSettings[templateId]` (in-memory only). Used by the template switcher to remember per-template tweaks within a session.
- `saveTemplateDefaults(templateId)` → same snapshot, but written to `localStorage.templateDefaults`. Used to persist user-customized template defaults across sessions.

These are largely vestigial — the template system has moved to server-side storage in the `templates` table. Don't add new logic to these unless you have a specific reason.

---

## 7. Routing & Page Components

File: `src/App.tsx`.

```tsx
<Routes>
    <Route path="/"                 element={<MainLayout />} />
    <Route path="/t/:templateId"    element={<MainLayout />} />
    <Route path="/l/:slug"          element={<MainLayout />} />
    <Route path="/l/:slug/:designSlug" element={<MainLayout />} />
    <Route path="/verify"           element={<VerifyOrder />} />
    <Route path="/render/:token"    element={<PosterRenderPage />} />
    <Route path="/gallery"          element={<GalleryPage />} />
    <Route path="/privacy"          element={<PrivacyPolicy />} />
    <Route path="/admin/*"          element={<AdminLayout />} />
</Routes>
```

`MainLayout` handles four URL shapes:
- `/` → loads Design001 from the first listing automatically (or restores the last autosave).
- `/t/:templateId` → loads a single template by ID.
- `/l/:slug` → loads a listing collection, picks the first design's 8x10 template as the initial template, and shows the design picker in the sidebar.
- `/l/:slug/:designSlug` → same as above but starts on the specified design (used for A/B testing different ad/listing variants).

Bare slugs like `/star-map-night-we-met` redirect to `/l/star-map-night-we-met` via a top-level `<Navigate>` rule.

`AdminLayout` is lazy-loaded (`React.lazy`) so the public bundle doesn't include admin pages.

---

## 8. Core Components — Deep Dive

### 8.1 `src/components/MainLayout.tsx` (~850 lines)

**Purpose:** the designer page. Split-pane layout with the SVG poster preview on the left and the controls sidebar on the right.

**Responsibilities:**
- URL parsing — picks up `templateId`, `slug`, `designSlug` from the route.
- Auto-loads Design001 when the user lands on `/` (so they never see the bare Zustand defaults like "My Star Map").
- Decodes the `?d=` query param when a share link is opened — applies a custom design state on top of the loaded template.
- Listing fetch — when `slug` is present, GETs `/api/listings/:slug`, groups templates by `design_group_id` into `DesignGroup[]`, picks the appropriate initial template, applies it.
- Mounts `<VectorStarMap />` (the SVG poster).
- Mounts `<StreetMapCapture />` offscreen (only when `posterType !== 'starmap'`).
- Renders the right-side `<SidebarControls />`.
- Pan/zoom on the preview — desktop wheel + sidebar slider; mobile pinch-to-zoom + drag.
- Undo/redo keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z).
- Copy-poster-to-clipboard via `navigator.clipboard.write`.
- Sidebar resize via drag handle.
- Autosave restore prompt (7-day window).
- Renders the diagonal "DEMO" watermark overlay over the preview (matches what's baked into watermarked exports).
- Loading spinner while a template is being fetched/applied.

**Key state:**
- `designGroups: DesignGroup[]` — populated when on a listing page.
- `templateLoading: boolean` — controls the loading spinner. **Always starts true** because the `/` route auto-loads Design001.
- `previewDimensions` — recomputed on `printSize` change to fit the poster in the available area while preserving aspect ratio.

**Map capture wiring:**
```tsx
const handleMapCapture = useCallback((dataUrl: string) => {
    useStore.getState().setMapImageOffsetX(0);
    useStore.getState().setMapImageOffsetY(0);
    setMapBackgroundImage(dataUrl);
}, [setMapBackgroundImage]);

// ...
{posterType !== 'starmap' && (
    <Box position="fixed" top="-9999px" left="-9999px" width="1200px" height="1200px">
        <React.Suspense fallback={null}>
            <StreetMapCapture onCapture={handleMapCapture} />
        </React.Suspense>
    </Box>
)}
```

The offset reset is critical — when a new map capture replaces the old one, the user's drag offset within the old image becomes meaningless.

### 8.2 `src/components/VectorStarMap.tsx` (~1820 lines)

**Purpose:** the SVG renderer. Reads the entire Zustand store, builds a single `<svg>` element with the entire poster.

**Structure:**
- One JSX `<svg id="poster-preview-svg" ref={svgRef}>` with three named layer groups and a portal mount.
- Three `useEffect` blocks each rebuild a layer when its dependencies change:
  1. **Background layer** — clip path + the inner shape's fill (or `<image>` if street/colored map).
  2. **Stars/Map layer** — D3 projects stars OR no-op for map mode.
  3. **Text layer** — title/subtitle/dedication/details/divider rows, drag handles, decorative heart.

**Why D3 + useEffect instead of declarative React children?**
React is too slow at updating 200+ SVG circles when a slider moves. D3 mutates the DOM directly, which is significantly faster. Each `useEffect` `selectAll('*').remove()`s its own layer first, then rebuilds it.

**Coordinate space:**
- The viewBox is fixed at `0 0 1200 (1200/aspectRatio)` regardless of the print size.
- All math is in viewBox units (often called "SVG pixels" in the comments).
- The poster is then CSS-scaled by `previewZoom` for display.
- The `getScreenCTM()` of any element accounts for SVG transforms but **not** CSS transforms — so D3 drag handlers must divide `event.dx/dy` by `previewZoom` (read from `useStore.getState().previewZoom`).

**Drag interactions:**
- Each text row has its own `drag<SVGGElement, unknown>` from `d3-drag`. The drag handler updates the corresponding `*OffsetY` field in the store.
- The shape itself can be dragged via an outer `shapeInteract` rect.
- The map image (within the shape) can be dragged via a `hitGroup` rect/path that is `.raise()`'d above the shape rect so it captures clicks first. The hit area is inset by `MAP_EDGE_ZONE` (44 px) so the outer ring of the shape falls through to shape-drag.
- The location pin can be dragged independently.
- All these listeners are added inside `useEffect`s, and **the order they're added matters**. SVG hit-testing is paint-order-based — later children are painted on top and intercept clicks first.

**Inline editing:**
- Double-clicking a text row sets `inlineEdit = { field, value, ... }`.
- `MainLayout`'s preview pan handler reads `isInlineEditingRef` (synced via `useStore.subscribe`) to skip pan during edits.
- An HTML `<input>` is portaled to `document.body` over the text element. `onBlur`/`Enter` commits the new value via `setCustomText(field, value)`.

**Snap to center:**
- When dragging the shape and `snapEnabled` is true, the X position snaps to the horizontal center within ±15 SVG pixels. A snap-guide vertical line appears while snapped.

**Heart decoration drag:**
- Split into `heartOuter` (translate only, drag attached) + `heartInner` (scale only, path inside).
- The split is necessary because D3 drag projects `event.dy` into the dragged element's local coordinate space — putting the scale on the same group as the drag would 2x the effective drag distance.

**Scroll-wheel zoom (street/colored map only):**
- A `wheel` event listener at the SVG level checks if the cursor is inside the map shape, then increments `mapZoom` by ±0.5 per click.
- Uses `e.preventDefault()` to keep the page from scrolling.

**Performance:**
- Uses `useDebounce` hook (200 ms) on kerning, shape sizes, and shape offsets to throttle slider drag updates.
- Star data is fetched once and cached in component state.
- `useShallow` from `zustand/react/shallow` ensures the component only re-renders when one of the destructured fields actually changes (not on any store update).

### 8.3 `src/components/StreetMapCapture.tsx` (~600 lines)

**Purpose:** offscreen MapLibre renderer that captures the map as JPEG data URLs and forwards them via the `onCapture` prop.

**Why offscreen?**
The visible poster is the SVG poster — MapLibre renders separately into a hidden DOM node and we just snapshot its WebGL canvas as an image.

**Capture strategies:**
- `captureQuick()` — snapshots the current 1200 × 1200 canvas, downscales to 800 px JPEG (quality 0.75). Synchronous-ish (uses `toBlob` + `FileReader`). Used for instant feedback during/after pan and zoom.
- `captureStitched()` — jumps the map to four quadrant-center positions at `zoom + 1`, captures each tile, stitches into a 7200 × 7200 JPEG (quality 0.92). 4 sequential `idle` waits. Provides higher per-pixel resolution for the live preview.
- `captureHighRes()` — jumps to a 3 × 3 grid at `zoom + 2`, produces 10800 × 10800 JPEG (quality 0.94). Registered in the store via `setCaptureHighResFn` so `DownloadButton` can call it before exporting.

**Coordination state (refs):**
- `isCapturingRef` — true while `captureStitched` or `captureHighRes` is doing tile jumps. Blocks concurrent captures and `captureQuick` calls (which would catch the map mid-jump).
- `pendingCaptureRef` — set when the coordinate `useEffect` fires during a stitch, indicating a position change happened mid-stitch and the result should be discarded + restitched.
- `captureVersionRef` — incremented synchronously in a Zustand subscription whenever `mapCenterLat/Lng/Zoom/Bearing/StyleUrl/PosterType/Colors` change. The stitch reads this at start; if it has changed at end, the stitch result is discarded.
- `suppressNextMoveendRef` — set to true before the stitch's restore `jumpTo`. Suppresses the resulting `moveend` so it doesn't trigger another stitch.
- `colorDebounceRef`, `stitchDebounceRef` — `setTimeout` handles for debouncing.

**Critical ordering rule:**
> Always register `map.once('idle', cb)` BEFORE calling `map.jumpTo()`.
>
> If you do them in the wrong order, when tiles are already cached the map may already be in idle state when the listener registers, and the listener fires for a *later* unrelated event — capturing the wrong frame.

**Style switching:**
- A `useEffect` watches `mapStyleUrl`. When it changes, the effect calls `map.setStyle(newStyle)`, then on `styledata` applies POI filter (for prebuilt styles) and re-stitches.
- A second `useEffect` watches `posterColor` and `mapStreetColor`. For 2-color custom styles it uses `setPaintProperty` (no tile reload) for instant color changes.

**Map color presets:**
Defined in `MAP_COLOR_PRESETS_FULL` (line 124). 5 themes (midnight, sunset, etc.) plus two "specials":
- `design2` — black/gray/white with 4 road tiers (custom style function, used for the rectangle template).
- `realistic` — uses OpenFreeMap's prebuilt "bright" style URL.

**The 4-tier road color system in `createDesign2Style`:**
| Tier | Filter | Color |
|------|--------|-------|
| 1 — Motorway/Trunk | `class IN ('motorway','trunk')` | `#111111` (black) |
| 2 — Primary/Secondary | `class IN ('primary','secondary')` | `#444444` (dark gray) |
| 3 — Tertiary/Minor/Residential | etc. | `#777777` (medium gray) |
| 4 — Service/Other | fallback | `#aaaaaa` (light gray) |

Plus water (`#888888`), landuse (`#cccccc`), buildings (`#dddddd`).

**Heritage POI filter (line 209):**
For the realistic style, runs after `styledata`. Iterates every layer with `source-layer === 'poi'` and replaces its filter with one that only matches subclasses in a heritage allowlist (museum, viewpoint, historic, religion, gallery, attraction). Hides Starbucks-style POIs that would clutter the poster.

**Predictive prefetch (line 154-192):**
After a stitch completes, the function `predictivePrefetch` quietly jumps the map to adjacent tile coords at the same zoom, then back. This warms MapLibre's tile cache (and the service worker cache in `public/tile-sw.js`) so subsequent panning is faster.

**Service worker tile cache (`public/tile-sw.js`):**
Registered in `main.tsx`. Intercepts `https://tiles.openfreemap.org/*` requests. Cache strategy: `cache-first` for `.pbf` tiles, `network-first` for style JSON.

### 8.4 `src/components/SidebarControls.tsx` (~840 lines)

**Purpose:** wrapper around the five sidebar panel components, plus the design-card grid (when on a listing page) and the size picker.

**Structure (Chakra Accordion):**
1. **Designs** (only when `designGroups.length > 0`) — grid of thumbnail cards. Clicking a card switches to that design group's 8x10 template.
2. **Size** — radio-style buttons for the print sizes available in this listing/design. Backed by `PRINT_SIZE_MAP` from `applyTemplate.ts`.
3. **Text Content** → `<TextContentPanel />` (title, subtitle, date, location, dedication, names text inputs + visibility toggles).
4. **Typography** → `<TypographyPanel />` (per-row font, size, kerning, vertical offset, all-caps).
5. **Map / Location** (street/colored map only) → `<MapControlsPanel />` (city search, zoom, bearing, location pin, color presets).
6. **Color** → `<ColorPanel />` (poster bg, text, star, map interior).
7. **Style** → `<StylePanel />` (shape, frame, rings, decorations, divider).
8. **Download** → `<DownloadButton />` (export PNG/PDF).

**Design card grid (line ~250):**
- Hardcoded `aspectRatio: '4/5'` — every card displays at 4:5 regardless of the design's native ratio. Always uses the design's 8x10 thumbnail.
- Cache-bust `?v=N` on the img src — increment when thumbnails change.
- Click handler: `await fetchAndApplyTemplate(thumbSize.id, { designGroupId: group.id })`. Updates the URL to `/l/:slug/design00N` via `navigate`.

**Size picker (line ~310):**
- `selectedDesignGroup.sizes` is the list of sizes available for the currently-selected design group.
- Click handler: `await fetchAndApplyTemplate(targetSize.id, { preserveText: true, designGroupId })`. `preserveText: true` keeps the user's title/subtitle/etc. when switching sizes.

**Hidden when `designGroups.length === 0`:**
The poster-type toggle (Star Map / Street Map / Colored Map) is hidden in customer/listing mode — customers shouldn't be able to switch a star-map listing to street-map mode.

### 8.5 `src/components/DownloadButton.tsx`

**Purpose:** the export flow. Two paths:
- Customer mode (`!isTemplateMode`) — opens a modal offering "Download Preview" (watermarked PNG only — PDF was removed as it would substitute for the paid product).
- Admin mode (`isTemplateMode`, only on `/admin/template-editor/*`) — offers full PNG/PDF export at chosen DPI without watermark.

**Export logic:**
1. Get the SVG element via `document.getElementById('poster-preview')?.querySelector('svg')`.
2. If `posterType !== 'starmap'` and `useStore.getState().captureHighResFn` exists, await it to replace `mapBackgroundImage` with the 10800px stitched version.
3. Call `renderPosterToBlob(svgEl, w, h, dpi, watermark)` from `utils/renderPoster.ts`.
4. Trigger a browser download with `URL.createObjectURL(blob)`.

**Watermark:**
A diagonal repeating "SAMPLE / themappedmoment.com" pattern is drawn on the canvas after the SVG renders — see `drawDemoWatermark()` in `renderPoster.ts`. The DOM-level watermark in `MainLayout` is just a CSS overlay that mimics what the export will produce.

### 8.6 `src/components/CitySearch.tsx`

**Purpose:** debounced Nominatim autocomplete for city names.

- 500 ms debounce on input.
- Fetches `https://nominatim.openstreetmap.org/search?format=json&q={query}&limit=5`.
- Parses results into `GeoResult[]` from `utils/geocode.ts`.
- On select: setMapCity(name), setMapCenterLat(r.lat), setMapCenterLng(r.lng), and if `r.boundingbox` is present, setMapZoom(zoomFromBbox(r.boundingbox)).

### 8.7 `src/components/GlyphPicker.tsx`

**Purpose:** visual glyph browser for the "Mapped Moment Script" font (which has many decorative ligatures and swashes). Used inside the inline editor to insert special glyphs.

- Renders a grid of glyph buttons.
- On click: sets `pendingGlyphForInlineEdit` in the store.
- The inline edit `<input>` watches that field and inserts the glyph at the cursor position when it changes.

### 8.8 `src/components/ListingPage.tsx`

**Purpose:** the public collection page at `/l/:slug`. Shown to first-time visitors as an alternative landing experience to going straight into the designer.

- Fetches `/api/listings/:slug`.
- Renders a hero banner + a grid of design cards (each 4:5 with the 8x10 thumbnail).
- Click → `/t/:templateId` (designer with that template loaded).

In practice, most listings now redirect from `/l/:slug` directly into `MainLayout` with the listing loaded. This page is a fallback / SEO entry.

### 8.9 `src/components/VerifyOrder.tsx`

**Purpose:** the customer-facing purchase flow at `/verify`.

**State machine:**
1. User enters Etsy order number → `POST /api/verify-order { etsyOrderId, designToken? }`.
2. Server returns either `{ status: 'sent', downloadUrl }` (if pre-rendered) or `{ status: 'rendering' }`.
3. If `rendering`, frontend polls `GET /api/order-status?etsyOrderId=X` every 5s.
4. When server returns `status === 'sent'`, frontend shows the download button.
5. User can request up to 3 free revisions.

### 8.10 `src/components/PosterRenderPage.tsx`

**Purpose:** a printable view at `/render/:token`. Used by the server-side Puppeteer renderer to load a saved design state and screenshot the poster without the chrome of the designer.

- Loads the design from `/api/design/:token`.
- Applies it to the store.
- Renders only `<VectorStarMap />` at the design's print size, no sidebar, no UI chrome.
- Once stars/map have rendered, signals readiness via a `data-ready="true"` attribute that Puppeteer waits for.

### 8.11 `src/components/ErrorBoundary.tsx`

Standard React error boundary. Wraps the app at the root. On error: shows a "Something went wrong" message with a reload button and POSTs the error to `/api/events` for telemetry.

### 8.12 `src/components/WelcomeModal.tsx`

First-visit modal that explains the product. Shown once per browser via `localStorage.welcomeModalShown`.

---

## 9. Sidebar Panels

All in `src/components/sidebar/`. Each is a self-contained Chakra `<AccordionItem>`.

### 9.1 `TextContentPanel.tsx`
- Inputs for `title`, `subtitle`, `date` (date picker), `location` (with `<CitySearch />` for street maps), `dedication`, `names`.
- Toggles for `showLocation`, `showDate`, `showCoords`, `showDivider`, `showNames`, `showHeartDecor`.
- Each text field writes to `customText.<field>`.

### 9.2 `TypographyPanel.tsx`
- Tabbed UI — one tab per text row (Title / Subtitle / Details / Dedication / Names).
- Each tab has: font family dropdown, font size slider, kerning slider, vertical offset slider, all-caps toggle (Title only).
- Active tab is synced with `activeTypoField` in the store — clicking a text row in the poster auto-switches the active tab.
- `TITLE_FONTS`, `SUBTITLE_FONTS`, `DETAILS_FONTS` — arrays of font names. Adding a new font means adding it here AND to `fontRegistry.ts`.

### 9.3 `MapControlsPanel.tsx`
- City search via `<CitySearch />`.
- Lat/Lng number inputs.
- Zoom slider (5-20) + zoom preset buttons (Region / City / District / Street).
- Rotation (bearing) slider 0-360.
- Location pin toggle + size slider.
- Map color preset grid (each preset is a 2-color swatch).
- Custom bg color and street color pickers (when no preset is selected).
- The zoom/rotation handlers also reset the location pin offset to 0 — when the map moves, a positional pin offset is no longer meaningful.

### 9.4 `ColorPanel.tsx`
- Poster background color.
- Text color.
- Star color (star map only).
- Map interior color (street map only — fills the gap inside the shape if the map image doesn't fill it).
- Light mode toggle.

### 9.5 `StylePanel.tsx`
- Shape buttons (Circle / Heart / House / Rect).
- Shape size slider (per shape).
- Snap-to-center toggle.
- Show shape outline toggle + width slider.
- Frame: show toggle + inset + width sliders.
- Inner ring (circle only): toggle + width + inset.
- Outer ring (circle only): toggle + width + gap.
- Show grid (star map only) + grid width + opacity.
- Show milky way (star map only).
- Show constellations (star map only).
- Border style: simple / double-offset / dashed.
- Design style: standard / fineline / minimal.

### 9.6 `sidebarStyles.ts`
- Shared Chakra style props for slider rows, toggle buttons, etc.
- `toggleButtonStyles` — used by the design type toggle (Star/Street/Colored).

---

## 10. Utilities

### 10.1 `src/utils/astronomy.ts`

Computes the projection rotation needed to render the night sky from a given observer position.

```ts
getJulianDate(date: Date): number       // Astronomical day count
getGMST(date: Date): number             // Greenwich Mean Sidereal Time in degrees
getLST(date: Date, longitude): number   // Local Sidereal Time
getProjectionRotation(date, lat, lng): [yaw, pitch, roll]
```

The result is fed into `geoStereographic().rotate(...)` in `VectorStarMap`. The math is standard astronomical formulas — don't change it without verifying against a reference implementation.

### 10.2 `src/utils/geocode.ts`

```ts
interface GeoResult { name, displayName, lat, lng, country, state?, boundingbox? }
zoomFromBbox(bb: [number, number, number, number]): number
search(query: string): Promise<GeoResult[]>
reverse(lat, lng): Promise<GeoResult | null>
```

Wraps Nominatim. `zoomFromBbox` clamps to [5, 16] and assumes a ~600 px viewport — change the `560 / 512` constant if the viewport size changes.

**Nominatim courtesy:** they require a `User-Agent` header. The fetch sets `Accept-Language` and a UA identifying the app.

### 10.3 `src/utils/applyTemplate.ts`

The bridge between server-stored templates and the Zustand store.

- `PRINT_SIZE_MAP` — 22 print sizes mapped to `{ label, width, height, ratio }`.
- `TEMPLATE_FIELD_DEFAULTS` — fallback values for template fields. Used when an old template is loaded that's missing a newer field.
- `TEMPLATE_FIELDS` — whitelist of fields read from `settings_json`.
- `CUSTOM_TEXT_KEYS = ['dedication', 'names']` — fields that map into `customText.*` instead of top-level state.
- `TEXT_FIELDS = Set(['title', 'subtitle', 'dedication', 'location', 'lat', 'lng'])` — fields skipped when `preserveText: true` (size switch).

`applyTemplate(settings, { preserveText })`:
1. For each whitelisted field, use settings value or fallback default. Resolves `printSize` string → object.
2. If not preserving text, **resets all `customText` fields** to template values (or empty). Critical: prevents stale text from a previous design carrying over.
3. Calls `setPosterType` first if present (it has side effects).
4. Applies remaining fields via `useStore.setState(updates)`.

`captureCurrentSettings()` — the inverse: snapshots the current store into a `settings_json`-compatible object. Used by admin template editor.

`fetchAndApplyTemplate(templateId, options)` — GETs `/api/templates/:id`, calls `applyTemplate`, also sets `selectedTemplateEtsyUrl` (for the Etsy CTA on the download modal) and `activeDesignGroupId`.

**Adding a new design field — checklist:**
1. Add to `useStore.ts` interface + default + setter + `DESIGN_FIELDS`.
2. Add to `applyTemplate.ts` `TEMPLATE_FIELDS` and `TEMPLATE_FIELD_DEFAULTS`.
3. Add to `applyTemplate.ts` `captureCurrentSettings` if it's not already covered.
4. Add to `VectorStarMap.tsx` destructure + dependency arrays where relevant.
5. Add to `SidebarControls.tsx` or one of the sidebar panels.

### 10.4 `src/utils/renderPoster.ts`

The export pipeline (~185 lines).

`renderPosterToBlob(svgEl, w, h, dpi, watermark)`:
1. Clone the SVG.
2. Set width/height attributes to `w * dpi` × `h * dpi`.
3. `collectUsedFontFamilies(svgClone)` — scans `[font-family]` attrs, splits comma-separated stacks (`"Title001, serif"` → `["Title001", "serif"]`), collects unique names.
4. `buildInlineFontStyle(usedFamilies)` — for each family in `FONT_REGISTRY`, fetches the woff2 file, base64-encodes it, builds an `@font-face` rule with the `data:font/woff2;base64,...` URL.
5. Inserts an inline `<style>` element at the top of the SVG with all the `@font-face` rules.
6. Serializes to a Blob → object URL → loads into an `Image` → draws onto a canvas.
7. If `watermark: true`, calls `drawDemoWatermark(ctx, w, h)` — diagonal repeating "SAMPLE / themappedmoment.com" with a dark shadow + bright text pass.
8. `canvas.toBlob('image/png')` → resolves the Promise.

`renderPosterToPdf(svgEl, w, h, title)` — calls `renderPosterToBlob` at 300 DPI, lazy-imports `jspdf`, embeds the PNG into a PDF sized to inches → mm.

**Why fonts must be embedded:**
The blob URL SVG → canvas pipeline runs in a sandboxed context. Blob URLs cannot resolve relative `@font-face src URLs` — the browser blocks it. Without inline base64 fonts, the canvas falls back to system fonts (e.g. Arial instead of Title001), producing wrong-looking exports.

**Performance notes:**
- `fontDataUriCache: Map<string, string>` — base64 fonts are cached per session.
- A 150 DPI 8x10 export with embedded fonts is ~400 KB. Without fonts: ~150 KB. Use file size as a smoke test.

### 10.5 `src/utils/fontRegistry.ts`

```ts
import Title001_400 from '../assets/fonts/Title001-400-normal.woff2?url';
// ...

export const FONT_REGISTRY: Record<string, { weight: string; url: string }[]> = {
    'Title001': [{ weight: '400', url: Title001_400 }],
    // ...
};
```

The `?url` suffix is a Vite-specific import that returns the hashed production path. This is the **only** reliable way to reference fonts in the embedded-font path because:
- Relative paths break in the blob URL context.
- Hardcoded paths break when Vite hashes filenames.

**Always use `?url` imports for any asset that needs to be embedded in a Blob/data URL pipeline.**

### 10.6 `src/utils/analytics.ts`

```ts
export function trackEvent(name: string, props?: Record<string, unknown>): void {
    fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, props, sessionId }),
        keepalive: true,
    }).catch(() => {});
}
```

Fire-and-forget. `sessionId` is a per-session UUID stored in `sessionStorage`. Tracked events:
- `page_view` (path, template)
- `template_load` (templateId)
- `design_view` (slug, designSlug, designGroupId)
- `download_init` (format, dpi)
- `copy_image`
- Order verification flow events.

Used for A/B testing — different `designSlug` URLs on different Etsy listings/ads can be compared via `design_view` event counts in the admin analytics page.

---

## 11. Hooks & Helpers

### `src/hooks/useDebounce.ts`

```ts
export function useDebounce<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}
```

Used in `VectorStarMap.tsx` for kerning sliders, shape sizes, shape offsets — anywhere rapid slider input would otherwise re-run an expensive D3 layout.

---

## 12. Admin Panel

All admin pages live in `src/admin/` and are mounted under `/admin/*`. Auth via JWT in localStorage, proxied through `adminApi.ts`.

### Admin pages overview

| Page | Path | Purpose |
|------|------|---------|
| `AdminLogin` | `/admin/login` | Username + password, returns JWT |
| `AdminLayout` | `/admin/*` | Wrapper with sidebar nav |
| `DashboardPage` | `/admin/dashboard` | Stats + revenue panel + recent orders |
| `OrdersPage` | `/admin/orders` | Order list with filters, bulk actions, CSV export |
| `OrderDetailPage` | `/admin/orders/:id` | Single order view + timeline + retry/fulfill |
| `QueuePage` | `/admin/queue` | Render queue status, retry failed jobs |
| `TemplatesPage` | `/admin/templates` | Template grid CRUD |
| `TemplateEditorPage` | `/admin/template-editor/:id` | WYSIWYG template editor (uses MainLayout in admin mode) |
| `ListingsPage` | `/admin/listings` | Listing CRUD |
| `ListingDesignsPage` | `/admin/listings/:id/designs` | Drag-to-reorder design groups within a listing |
| `DesignEditorPage` | `/admin/design-groups/:id` | Edit base settings of a design group |
| `DesignImportPage` | `/admin/design-import` | Bulk import templates from a JSON file |
| `EtsyPage` | `/admin/etsy` | Etsy listing sync controls |
| `AnalyticsPage` | `/admin/analytics` | Event log viewer |
| `AssetsPage` | `/admin/assets` | Image/font upload |
| `SettingsPage` | `/admin/settings` | Global settings + email config + fulfillment providers |

### `src/admin/adminApi.ts`

Tiny fetch wrapper. Reads JWT from `localStorage.adminJwt`, attaches `Authorization: Bearer <jwt>`, throws on non-2xx.

```ts
export async function adminApi<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const jwt = localStorage.getItem('adminJwt');
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
            ...(init?.headers || {}),
        },
    });
    if (res.status === 401) {
        localStorage.removeItem('adminJwt');
        window.location.href = '/admin/login';
        throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}
```

### Template editor mode

`TemplateEditorPage` mounts `<MainLayout />` with the template loaded, plus an extra "Save Template" button that:
1. Calls `captureCurrentSettings()` from `applyTemplate.ts`.
2. POSTs `/api/admin/templates/:id` with the captured settings.
3. Optionally syncs the style fields to all sibling templates in the same design group (templates with the same `design_group_id` but different sizes).

Style sync logic is in `server/routes/templates.js` — the `STYLE_SYNC_FIELDS` array lists which fields propagate to siblings. **Position/layout fields are NOT in the list** because they're per-aspect-ratio (an offset in px doesn't translate across sizes).

---

## 13. Backend Server

### 13.1 `server/index.js`

Single Express entry. Mounts middleware in order:
1. **helmet** with custom CSP (`defaultSrc 'self'`, plus relaxed for Vite HMR + MapLibre + d3-celestial CDN).
2. **CORS** — origins from `CORS_ORIGIN` env var, comma-separated.
3. **express-rate-limit** — 5/15min on admin login, 30/min on public writes, 60/min on public reads.
4. **morgan** request logging.
5. JSON body parsing (50 MB limit for design state).
6. Static `/uploads` serving with `Cache-Control: max-age=1y, immutable`.
7. Mounts route modules (`/api/*`, `/auth/*`).
8. Starts the render queue worker.
9. Starts the daily seller digest cron (8 AM).
10. Starts the Etsy poll cron (every 2 min) only if `ETSY_ACCESS_TOKEN` is set.
11. `app.listen(PORT)`.

### 13.2 `server/db.js`

Initializes the SQLite database at `process.env.DB_PATH || server/data/db.sqlite`. Enables WAL mode, then runs CREATE TABLE IF NOT EXISTS for every table, then runs idempotent migrations (column adds via `ALTER TABLE`).

Exports the `Database` instance as default. Most route files do `import db from '../db.js';`.

### 13.3 `server/middleware/auth.js`

```ts
loginHandler(req, res)               // POST /api/admin/login
requireAdmin(req, res, next)         // JWT verify middleware
```

Login compares password against `bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)`. Returns a JWT signed with `JWT_SECRET`, valid for 30 days. The middleware reads the `Authorization: Bearer ...` header, verifies, attaches `req.admin = decoded`.

### 13.4 `server/middleware/validate.js`

Generic Zod-style validator. Each route file declares its schemas and passes them to `validate(schema)` middleware.

### 13.5 Route modules

**`designs.js`** (no auth):
- `POST /api/save-design` — body: `{ state }`. Generates a token (UUID), stores `state_json` row, returns `{ token }`. Used to share designs via `?d=token` on URLs (separate from the `?d=base64state` short-form).
- `GET /api/design/:token` — returns the saved state.

**`download.js`** (no auth):
- `GET /api/download/:token` — signed download URL handler. Verifies HMAC (`DOWNLOAD_SECRET`), serves the rendered file from `RENDERS_DIR` with `Content-Disposition: attachment`. URL is generated by `verify.js` after a successful order render.
- `GET /api/order-status/:token` — public poll endpoint for download readiness.

**`verify.js`** (rate-limited, no auth):
- `POST /api/verify-order` — body: `{ etsyOrderId, designToken? }`. Looks up Etsy receipt via `etsyFetch`. Validates payment status. Creates `orders` row. Either returns the existing render (if pre-rendered) or enqueues a render job.
- `GET /api/download-file/:orderId` — verifies signature, serves PNG. 7-day expiry, 3 free revisions.
- `GET /api/order-status?etsyOrderId=X` — polled by the verify page every 5s.

**`templates.js`** (mixed):
- `GET /api/templates` (public) — paginated list with filters.
- `GET /api/templates/:id` (public) — single template with `settings_json` parsed.
- `GET /api/templates/:id/thumbnail` (public) — proxies the thumbnail from `public/designs/`.
- `GET /api/templates/by-listing/:listingId` (public) — templates for a listing.
- Admin CRUD endpoints (POST, PUT, DELETE).
- `POST /api/admin/templates/:id/sync-style` — propagate `STYLE_SYNC_FIELDS` to sibling templates.

**`listings.js`** (mixed):
- `GET /api/listings/:slug` (public) — listing row + all linked templates (via `listing_templates`). Returns templates ordered by `position`. **Never deduplicates** — `MainLayout` needs all sizes to build the size picker.
- Admin CRUD for listings.
- `POST /api/admin/listings/:id/templates` — link template to listing.
- `DELETE /api/admin/listings/:id/templates/:templateId` — unlink.
- `PUT /api/admin/listings/:id/templates/reorder` — bulk position update.
- Design group CRUD (`/api/admin/design-groups/*`).
- Listing fulfillment options (`/api/admin/listings/:id/fulfillment-options`).

**`auth.js`** (no auth, public Etsy OAuth flow):
- `GET /auth/etsy` — initiates PKCE flow, redirects to Etsy.
- `GET /auth/etsy/callback` — handles the OAuth callback, exchanges code for tokens, persists to `.env` via direct file write.

**`admin-orders.js`** (admin only):
- Order list/detail/timeline.
- `PATCH /admin/orders/:id/status` — change order status.
- `PATCH /admin/orders/:id/notes` — seller notes.
- `POST /admin/orders/:id/render` — re-trigger render.
- `POST /admin/orders/:id/fulfill` — manual fulfillment marker.
- `GET /admin/render-queue` — queue status.
- `POST /admin/render-queue/:id/retry` — retry a failed job.
- Bulk endpoints, CSV export, revenue stats.

**`admin-etsy.js`** (admin only):
- `GET /admin/etsy/status` — token validity check.
- `GET /admin/etsy/receipts` — recent Etsy receipts (proxy).
- `GET /admin/etsy/listings` — Etsy shop listings (proxy).
- `POST /admin/etsy/link` — bind an Etsy listing ID to a template.
- `POST /admin/templates/:id/publish-etsy` — create/update an Etsy listing from a template.
- `POST /admin/listings/:id/sync-etsy-inventory` — push variations + prices.
- `POST /admin/etsy/sync` — pull latest receipt data.

**`admin-settings.js`** (admin only):
- Global settings KV store.
- Fulfillment providers CRUD (Prodigi, Gelato, etc. pricing tables).
- Email config + test-email endpoint.

**`admin-assets.js`** (admin only):
- File upload (multer).
- `GET /assets/fonts.css` (public!) — serves a generated CSS with `@font-face` for every uploaded font (used by future user-uploadable fonts).

**`webhooks.js`** (no auth, signature-verified):
- `POST /webhooks/printify` — Printify status callbacks.

**`analytics.js`** (mixed):
- `POST /events` (public) — append to `events` table.
- `GET /admin/analytics` (admin) — paginated event browser.

### 13.6 Services

**`server/services/etsy.js`**:
- `etsyFetch(path, init)` — fetch wrapper that:
  1. Sets `x-api-key: keystring:shared_secret` (the colon format Etsy v3 requires).
  2. Sets `Authorization: Bearer <ETSY_ACCESS_TOKEN>`.
  3. On 401, calls `refreshAccessToken()` and retries once.
- `refreshAccessToken()` — POSTs `grant_type=refresh_token` to `https://api.etsy.com/v3/public/oauth/token`. Persists new tokens to `process.env` AND to `server/.env` (raw file write, regex-replace) so they survive restart.
- `pollAndFulfill(fulfillFn)` — fetches recent paid receipts, creates orders for new ones, calls `fulfillFn(order)` for each.
- `parseDesignToken(receipt)` — extracts the design token from the buyer's personalization note.

**`server/services/render.js`**:
- `renderOrder(order)` — dispatches:
  1. `RENDER_LAMBDA_URL` set → POST to Lambda.
  2. `ENABLE_LOCAL_RENDER=true` → call `renderLocal.js` (Puppeteer).
  3. Otherwise → throw "no renderer configured" (caller marks order `pending_manual`).
- `validateRenderOutput(path)` — checks file exists and is ≥ `MIN_RENDER_BYTES` (300 KB). A render below that threshold likely had a font-embedding failure.

**`server/services/renderLocal.js`**:
- Spawns Puppeteer.
- Navigates to `${FRONTEND_URL}/render/:token`.
- Waits for `[data-ready="true"]` attribute.
- Screenshots the SVG element at the design's print dimensions × 300 DPI.

**`server/services/renderQueue.js`**:
- `enqueueRender(orderId, token)` — inserts a `render_queue` row.
- `processNext()` — claims the oldest pending row, calls `renderOrder()`, updates status to `done` or increments `attempts` on failure.
- `MAX_ATTEMPTS = 3`. After 3 failures, the order is marked `failed`.
- `startRenderWorker()` — `setInterval(processNext, POLL_INTERVAL_MS)`. Default 10s.
- On success for digital orders: promotes order status to `sent`, calls `sendPosterReadyEmail()`.

**`server/services/email.js`**:
- `sendPosterReadyEmail(order, downloadUrl)` — Nodemailer `sendMail`.
- `sendSellerDailyDigest({ orders, revenue, failedCount, pendingCount })` — admin daily summary.
- SMTP config from `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars.

**`server/services/printify.js`**:
- `uploadImage(filePath)` — POSTs to Printify upload API.
- `createOrder(printifyShopId, lineItems, address)` — creates a print order.
- `submitOrder(printifyOrderId)` — sends to production.

(Currently a stub — Printify integration is not active. Plan is to switch to Prodigi for international fulfillment.)

---

## 14. Database Schema

The full DDL lives in `server/db.js`. Key tables:

### `designs`
| Column | Type | Notes |
|--------|------|-------|
| `token` | TEXT PK | UUID generated client-side |
| `state_json` | TEXT | JSON-encoded Zustand snapshot |
| `render_path` | TEXT | filesystem path to rendered PNG (if any) |
| `created_at` | INTEGER | unix epoch |

### `orders`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK AUTOINCREMENT | |
| `etsy_receipt_id` | TEXT UNIQUE | Etsy receipt ID |
| `token` | TEXT NOT NULL | references `designs.token` |
| `listing_type` | TEXT | `digital` / `print` / `framed` |
| `print_size` | TEXT | e.g. `8x10` |
| `status` | TEXT | `pending` → `rendering` → `sent` (digital) or `fulfilled` (print). Plus `pending_manual`, `failed` |
| `price_cents` | INTEGER | from `receipt.grandtotal.amount` |
| `render_path` | TEXT | path to rendered PNG |
| `printify_order_id` | TEXT | when sent to print |
| `etsy_buyer_name` | TEXT | |
| `etsy_buyer_email` | TEXT | |
| `ship_address_json` | TEXT | JSON shipping address |
| `seller_notes` | TEXT | |
| `revisions_used` | INTEGER DEFAULT 0 | max 3 |
| `fulfilled_at` | INTEGER | |
| `created_at` | INTEGER | |

### `templates`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | `{collection}-{design}-{size}`, e.g. `sm001-design001-8x10` |
| `name` | TEXT | `Design001 — 8×10"` |
| `description` | TEXT | |
| `fulfillment_size` | TEXT | `8x10`, `5x7`, etc. — must match the size suffix in `id` |
| `sell_price_cents` | INTEGER | |
| `design_group_id` | TEXT | e.g. `sm001-design001` (groups templates of same design across sizes) |
| `settings_json` | TEXT | JSON settings — see `applyTemplate.ts` `TEMPLATE_FIELDS` |
| `thumbnail_path` | TEXT | e.g. `/designs/SM001/Design001/8x10.png` |
| `is_active` | BOOLEAN | |
| `etsy_listing_id`, `etsy_listing_url` | TEXT | |

**`settings_json` contract:**
- Must include `printSize` matching `fulfillment_size`.
- Must include `titleAllCaps`, font sizes, offsets, etc.
- Style fields (font, kerning, color) propagate via `STYLE_SYNC_FIELDS` to siblings.

### `design_groups`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | e.g. `sm001-design001` |
| `listing_id` | INTEGER FK → listings | |
| `name` | TEXT | display name |
| `description` | TEXT | |
| `base_settings_json` | TEXT | shared settings template |

### `listings`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `slug` | TEXT UNIQUE | URL slug, e.g. `star-map-night-we-met` |
| `name` | TEXT | display name |
| `description`, `banner_image` | TEXT | |
| `is_active` | BOOLEAN | |
| `fulfillment_type` | TEXT | `digital` / `print` / `framed` |
| `base_price_cents` | INTEGER | |
| `etsy_listing_id`, `etsy_listing_url`, `etsy_title`, `etsy_description`, `etsy_tags`, `etsy_taxonomy_id`, `etsy_shipping_profile_id` | various | Etsy publishing fields |
| `poster_type` | TEXT | `starmap` / `streetmap` / `coloredmap` |
| `meta_title`, `meta_description` | TEXT | SEO |

### `listing_templates` (join)
| listing_id | template_id | position |
|------------|-------------|----------|
| INTEGER FK | TEXT FK | INTEGER |

PRIMARY KEY (`listing_id`, `template_id`). `position` controls card order on the listing page.

### `render_queue`
| id | order_id | token | status | attempts | error | created_at | processed_at |

`status` ∈ `pending` / `processing` / `done` / `failed`.

### `events`
Lightweight analytics log:
| id | name | props (JSON) | session_id | created_at |

### `order_events`
Per-order timeline:
| id | order_id | type | label | detail | actor | created_at |

### `assets`
Admin uploads:
| id | type | filename | file_path | metadata | created_at |

### `fulfillment_providers`
Reference pricing for print fulfillment:
| provider | product_type | size | print_cost | ship_cost_us | ship_cost_intl | has_api | notes | source_url |

### `settings`
KV store:
| key | value |

---

## 15. Render Pipeline

### Customer-driven flow

```
[Customer pays on Etsy]
        │
        ▼
[Etsy poll cron @ 2min]
        │
        ▼
[fetch receipt → create order row → enqueue render]
        │
        ▼
[Customer hits /verify, enters order#] 
        │
        ▼
[POST /api/verify-order]
        │
   ┌────┴────────────────────────────────┐
   ▼                                     ▼
[order pre-rendered]            [order not yet rendered]
   │                                     │
   ▼                                     ▼
[return downloadUrl]            [enqueue if not queued]
                                         │
                                         ▼
                                [poll /api/order-status]
                                         │
                                         ▼
                              [renderQueue worker picks up]
                                         │
                                         ▼
                              [renderOrder() — Lambda or Puppeteer]
                                         │
                                         ▼
                              [validate output ≥ 300KB]
                                         │
                                         ▼
                              [order.status = 'sent']
                                         │
                                         ▼
                              [sendPosterReadyEmail()]
```

### Render dispatch chain (`server/services/render.js`)

```
renderOrder(order)
  │
  ├── RENDER_LAMBDA_URL set → POST { token, dpi } to Lambda → Lambda returns PNG → save → validate
  │
  ├── ENABLE_LOCAL_RENDER=true → spawn Puppeteer locally → load /render/:token → screenshot → save → validate
  │
  └── Neither → throw "No renderer configured" → caller catches and sets order.status = 'pending_manual'
```

`validateRenderOutput(path)`:
- File exists.
- Size ≥ `MIN_RENDER_BYTES` (300 KB) — this catches blank/font-failed renders.

### Local Puppeteer renderer (`renderLocal.js`)

```
1. Launch headless Chrome
2. Page.goto(`${FRONTEND_URL}/render/:token`)
3. Wait for [data-ready="true"] (set by PosterRenderPage when stars/map loaded)
4. Locate the SVG element
5. Screenshot at exact print dimensions × 300 DPI
6. Save to `${RENDERS_DIR}/<token>.png`
7. Close browser
```

Memory: ~400 MB per Chrome instance. The t3.micro has 1 GB → needs swap. On the t3.micro, the recommendation is to use the Lambda renderer instead.

### Why two renderers?

The Lambda path was added because t3.micro can't reliably handle Puppeteer for prints over 18×24". The Lambda is a dedicated render function with predictable memory.

---

## 16. Etsy Integration

### Flow

1. **OAuth setup (one-time):** admin visits `https://themappedmoment.com/auth/etsy`. Server generates PKCE, redirects to Etsy. Etsy callbacks `/auth/etsy/callback` with a code. Server exchanges code for `access_token` + `refresh_token`, persists to `server/.env`.
2. **Polling:** every 2 min, `pollAndFulfill` fetches recent receipts. New paid receipts → new `orders` rows.
3. **Verification:** customer-side, `/verify` POSTs the receipt ID. Server fetches the receipt to confirm and reads buyer info.
4. **Token refresh:** `etsyFetch` retries on 401 with a token refresh.

### Critical gotchas

- `x-api-key` header MUST be `keystring:shared_secret` (colon-joined). OAuth client_id uses keystring only. This split is in `etsyHeaders()`.
- `ETSY_API_KEY` env var = keystring. `ETSY_API_SECRET` = shared secret.
- Tokens are written to `server/.env` directly. Make sure the user running the server has write access there.

### Listing publishing

`POST /admin/templates/:id/publish-etsy` creates an Etsy listing from a template. It composes:
- Title from the template name + design group description.
- Description with placeholders for personalization.
- Variations from the listing's fulfillment options (sizes × fulfillment types).
- Pricing from `templates.sell_price_cents`.

Once published, the resulting `listing_id` and URL are saved to the `templates` row. The download CTA on the customer page links to this Etsy URL.

---

## 17. Listing System

A "listing" represents one Etsy product. Each listing has:
- One or more **design groups** (visual variants — Design001, Design002, etc.)
- For each design group, one **template per size** (5x7, 8x10, 11x14, etc.)

### Database relationships

```
listings (1)
   │
   │ has-many via listing_templates
   ▼
templates (many)
   │
   │ design_group_id groups them
   ▼
design_groups (many) — also FK'd back to listings.id
```

### URL patterns

- `/l/:slug` — load listing, default to first design's 8x10.
- `/l/:slug/:designSlug` — same but starting on the specified design group. `designSlug` matches by:
  1. Exact `design_group_id`.
  2. The trailing `designNNN` segment.
  3. The kebab-cased `design_groups.name`.

This is used for **A/B testing** — different Etsy listings or paid ads can link to different `designSlug` URLs and we can compare conversion via the `design_view` event.

### Sidebar design picker

`SidebarControls` builds the design card grid from `designGroups` (passed in from `MainLayout`). Each group is rendered as a 4:5 thumbnail card (always using the 8x10 thumbnail). Clicking a card calls `fetchAndApplyTemplate(thumbnailSize.id, { designGroupId })` and updates the URL via `navigate(..., { replace: true })`.

### Adding a new listing

See `CLAUDE.md` "Design & Listing Creation Workflow" — it's a 7-step process. The key steps:
1. Insert `design_groups` row.
2. Insert one `templates` row per size.
3. Insert one `listing_templates` row per template (with correct `position`).
4. Update `scripts/sync-listing-state.cjs` to include the new design.
5. Run sync script locally + on prod.
6. Capture thumbnails to `public/designs/` AND `/var/www/poster-studio/designs/`.
7. Bump `?v=N` cache-bust in `SidebarControls.tsx` and `ListingPage.tsx`.

---

## 18. Font System

### Requirements

A custom font must work in **both** the browser preview AND the PNG/PDF export.

### Files involved

- `src/assets/fonts/*.woff2` — actual font files. Bundled via Vite.
- `src/assets/fonts/fonts.css` — `@font-face` declarations referencing local URLs. Loaded by `index.css`. Used by the browser preview.
- `src/utils/fontRegistry.ts` — Vite `?url` imports of every woff2. Used by the export pipeline to fetch + base64-encode.
- `src/utils/renderPoster.ts` — uses `FONT_REGISTRY` to embed fonts in the export SVG.
- `src/components/SidebarControls.tsx` — `TITLE_FONTS`, `SUBTITLE_FONTS`, `DETAILS_FONTS` arrays — controls which fonts appear in the dropdowns.

### Adding a new font

1. Place `Font-Name-400-normal.woff2` in `src/assets/fonts/`.
2. Add `@font-face` to `fonts.css`:
   ```css
   @font-face {
       font-family: 'Font Name';
       font-style: normal;
       font-weight: 400;
       src: url('./Font-Name-400-normal.woff2') format('woff2');
   }
   ```
3. Add to `fontRegistry.ts`:
   ```ts
   import FontName400 from '../assets/fonts/Font-Name-400-normal.woff2?url';
   // In FONT_REGISTRY:
   'Font Name': [{ weight: '400', url: FontName400 }],
   ```
4. Add to one of the arrays in `SidebarControls.tsx` (`TITLE_FONTS`, etc.).

If you skip step 3, the font shows in the browser but exports use a system fallback.

### Why so many steps?

- Step 1: source file.
- Step 2: makes it available to the browser preview.
- Step 3: makes it available to the export pipeline (cannot resolve relative `@font-face` URLs in blob context).
- Step 4: makes it pickable from the UI.

### Font verification

Run `node scripts/test-font-render.cjs` to render a poster with a specific font and verify the output PNG contains that font (file size ≥ 300 KB suggests fonts embedded).

---

## 19. Map System

### Color presets

- 5 base 2-color presets in `mapPresets.ts` (midnight, sunset, etc.)
- 1 special: `design2` — black/gray/white 4-tier road system, used for the rectangle template.
- 1 special: `realistic` — uses OpenFreeMap's prebuilt "bright" style.

The realistic preset triggers `applyHeritagePOIFilter` to hide non-historic POIs.

### Custom 2-color style

`createMapStyle(bgColor, streetColor)`:
- Background fill = `bgColor`.
- Water fill = `bgColor` (water disappears into background).
- Roads = single `roads_all` layer with zoom-based line-width. `class IN (motorway, trunk)` is widest, residential narrowest.
- No POIs, no labels, no buildings.

### Capture pipeline

`StreetMapCapture` exports three capture functions (only `captureHighRes` is exposed via the store):

1. `captureQuick`: read `getCanvas()` → 800 px JPEG → ~50 KB data URL → ~instant.
2. `captureStitched`: 4 tile jumps at zoom+1 → 7200 × 7200 JPEG → ~1 MB data URL → ~3 s.
3. `captureHighRes`: 9 tile jumps at zoom+2 → 10800 × 10800 JPEG → ~3 MB data URL → ~8 s.

The frontend uses `captureQuick` for instant feedback on pan/zoom, `captureStitched` debounced at 1.2s after `moveend` for high-quality preview, and `captureHighRes` only when exporting (called via `setCaptureHighResFn` from `DownloadButton`).

### Tile cache

`public/tile-sw.js` is a service worker registered in `main.tsx`. It caches `*.pbf` tile responses + style JSON. Cache key includes full URL with z/x/y. Different zoom levels are independent.

---

## 20. Build, Test, Deploy

### Local development

```bash
# Frontend
npm run dev          # Vite dev server on :5173

# Backend
cd server && node index.js   # Express on :3001
```

The frontend talks to the backend via `import.meta.env.VITE_API_URL`. In dev, this is set in `.env.development.local` to `http://localhost:3001`. In production builds, it's set to empty (same-origin) since nginx reverse-proxies.

### Production build

```bash
npm run build        # Outputs to dist/
npm run preview      # Local serve of dist/
```

### Testing

```bash
npm run build && npx playwright test   # ~400 e2e tests
npx playwright test tests/poster-modes.test.ts  # specific file
npx playwright test --headed           # visible browser
npx playwright test --grep "revenue"   # title match
npx playwright test --update-snapshots # rebaseline visual tests
```

`tests/fixtures/mockApi.ts` intercepts every `/api/**` route with canned responses (`MOCK_ORDERS`, `MOCK_TEMPLATES`, etc.). Tests do NOT hit the real backend.

**Map tests:** need `test.setTimeout(30000)`. Never `waitForLoadState('networkidle')` — MapLibre tiles never fully settle.

### Deploy frontend

```bash
npm run build
rsync -avz --delete --exclude='designs/' dist/ ubuntu@3.107.34.169:/var/www/poster-studio/
```

`--exclude='designs/'` is **critical**. The `dist/` build doesn't include thumbnails, but `--delete` would wipe `/var/www/poster-studio/designs/` if you don't exclude it.

### Deploy server

```bash
rsync -avz --exclude node_modules --exclude data --exclude .env \
  server/ ubuntu@3.107.34.169:/home/ubuntu/poster-studio/server/
ssh ubuntu@3.107.34.169 "cd /home/ubuntu/poster-studio/server && npm install --production && sudo systemctl restart poster-studio-api"
```

### Deploy DB state

DB state is **not** rsync'd. After admin/template/listing edits:

```bash
scp scripts/sync-listing-state.cjs ubuntu@3.107.34.169:/home/ubuntu/poster-studio/scripts/
ssh ubuntu@3.107.34.169 "node /home/ubuntu/poster-studio/scripts/sync-listing-state.cjs --db /home/ubuntu/poster-studio/server/data/db.sqlite"
```

### Server admin

```bash
ssh ubuntu@3.107.34.169
sudo systemctl status poster-studio-api
sudo systemctl restart poster-studio-api
sudo journalctl -u poster-studio-api -f    # live logs

sqlite3 /home/ubuntu/poster-studio/server/data/db.sqlite

sudo nginx -t && sudo systemctl reload nginx
ls /var/www/poster-studio/designs/
```

---

## 21. Scripts

All in `scripts/` (or root for capture scripts) and run with `node`.

### `scripts/sync-listing-state.cjs` (CRITICAL)

The single source of truth for DB state of templates and listings. Reads `DESIGNS` (per design group) and `LISTINGS_CONFIG` (per listing slug) configs at the top, then enforces:
1. `templates.settings_json.printSize === fulfillment_size`.
2. `templates.settings_json.titleAllCaps === designs[i].titleAllCaps`.
3. `templates.thumbnail_path === designs[i].thumbnail` (or per-size override).
4. `listing_templates` rows exist for every (listing, template) pair, with correct positions.

Run after ANY admin template/listing edits, locally and on prod.

### `scripts/seed-new-listings.cjs`

Bulk-inserts new listings + design groups + templates. Used when bootstrapping a new product line. Always followed by `sync-listing-state.cjs`.

### `scripts/verify-listing.cjs`

Playwright-based: launches Chromium, screenshots `https://localhost:5173/l/star-map-night-we-met` AND `https://themappedmoment.com/l/star-map-night-we-met`, saves to `/tmp/verify-local.png` and `/tmp/verify-prod.png`. Visual diff smoke test.

### `scripts/test-font-render.cjs`

Renders a poster (via `renderPosterToBlob`) with each available font and saves to `/tmp/font-verify-render.png`. File size ≥ 300 KB indicates fonts embedded; below that suggests font registry breakage.

### `capture-thumbnails.cjs` (root)

Playwright-based thumbnail capture. Loads each `/t/:templateId` URL, waits for `>100` SVG circles (proving stars rendered), captures the poster element at exactly its bounding box. Used to refresh design thumbnails.

### `capture-map-debug*.cjs`

Ad-hoc debug scripts. Don't rely on these for anything.

---

## 22. Common Tasks Cookbook

### Add a new color to `MAP_COLOR_PRESET_DATA`
1. Edit `src/components/mapPresets.ts`.
2. Add `{ id, name, bgColor, streetColor }` entry.
3. Done — picks up automatically in `MapControlsPanel`.

### Add a new shape (e.g. star)
1. `useStore.ts` — add `'star'` to `maskShape` union, add `starSize` field + setter + `DESIGN_FIELDS`.
2. `applyTemplate.ts` — add `starSize` to `TEMPLATE_FIELDS` + default.
3. `VectorStarMap.tsx` — handle `maskShape === 'star'` in shape rendering, hit-testing, drag, scroll-wheel zoom.
4. `StylePanel.tsx` — add a "Star" button to the shape buttons, add starSize slider behind `maskShape === 'star'`.

### Add a new text element
See "New Text Element Checklist" in `CLAUDE.md`. ~30 separate edits across the store, applyTemplate, renderer, and sidebar.

### Add a new admin route
1. Create `server/routes/admin-X.js`. Export a `router`.
2. `server/index.js` — `import` and `app.use('/api', adminXRouter)`.
3. Use `requireAdmin` middleware on all routes.

### Run a database migration
Add `ALTER TABLE` calls inside an idempotent migration block in `server/db.js`:

```js
{
    const cols = db.prepare("PRAGMA table_info(my_table)").all().map(c => c.name);
    if (!cols.includes('new_column')) {
        db.exec(`ALTER TABLE my_table ADD COLUMN new_column TEXT`);
    }
}
```

These run on every server start. Always check column existence first.

### Trigger a render manually
`POST /api/admin/orders/:id/render` (admin) — re-enqueues the order.

Or directly:
```js
// In server/services/renderQueue.js context:
enqueueRender(orderId, token);
```

### Add a new font
See §18 — 4 steps (asset, fonts.css, fontRegistry.ts, sidebar array).

### Investigate a DB inconsistency
1. `sqlite3 server/data/db.sqlite`.
2. `SELECT id, fulfillment_size, json_extract(settings_json, '$.printSize') FROM templates WHERE id LIKE 'sm001%';` — check printSize sync.
3. `SELECT lt.listing_id, t.id, t.fulfillment_size, lt.position FROM listing_templates lt JOIN templates t ON lt.template_id = t.id WHERE lt.listing_id = 1 ORDER BY lt.position;` — check listing membership.
4. Run `node scripts/sync-listing-state.cjs` to fix.

### Debug a failing render
1. Admin → Queue → see error message.
2. `sudo journalctl -u poster-studio-api | grep RenderQueue` — recent attempts.
3. Output file: `/home/ubuntu/poster-studio/server/data/renders/<token>.png`. If < 300 KB, font embedding likely failed.
4. `POST /api/admin/render-queue/:id/retry` to retry.

### Update map zoom thresholds
Edit `createMapStyle` in `StreetMapCapture.tsx`:
```ts
'line-width': [
    'interpolate', ['exponential', 1.5], ['zoom'],
    6,  ['match', ['get', 'class'], 'motorway', 1.5, ...],
    14, [...],
    18, [...],
] as maplibregl.ExpressionSpecification,
```

The `[zoom]` interpolation array maps zoom level → width per road class.

---

## 23. Glossary

| Term | Meaning |
|------|---------|
| **Template** | A single saved design at a specific size, e.g. `sm001-design001-8x10`. Stored in the `templates` table with a `settings_json` blob. |
| **Design group** | A logical group of templates that share the same visual design across sizes — `sm001-design001` covers Design001 in 5x7, 8x10, 11x14, etc. |
| **Listing** | A customer-facing product, accessible at `/l/:slug`. Contains multiple design groups, each in multiple sizes. Mapped to one Etsy listing. |
| **Settings JSON** | Per-template JSON blob in `templates.settings_json`. Defines all design fields (colors, fonts, sizes, offsets, etc.). |
| **Print size** | One of 22 named sizes in `PRINT_SIZE_MAP` — defines width, height, ratio in inches. The `printSize` field in `settings_json` is a string code (e.g. `"8x10"`); the store holds the resolved object. |
| **Fulfillment size** | The `templates.fulfillment_size` column. **Must equal** the `settings_json.printSize`. Drift = bug. |
| **Sync script** | `scripts/sync-listing-state.cjs`. Single source of truth for DB state. Run after every template/listing change. |
| **Design token** | UUID generated when a design is saved via `/api/save-design`. Used in Etsy personalization notes to link an order to a saved design. |
| **Receipt ID** | The Etsy order number entered by the customer on `/verify`. Verified via Etsy API. |
| **Render queue** | SQLite-backed FIFO of pending render jobs. Processed sequentially by the worker thread. |
| **Map shape / mask shape** | The clip path inside the poster — circle, heart, house, or rect. Renders the star map or street map. |
| **Custom text** | The `customText.*` sub-object in the store. Holds user-typed overrides for each text row (so the "default location" from a template can coexist with the user-typed value). |
| **Sibling templates** | Templates with the same `design_group_id` but different `fulfillment_size`. Style fields propagate across siblings via `STYLE_SYNC_FIELDS`. |
| **A/B testing** | Different `designSlug` URLs link different Etsy listings or ads. Conversion measured via the `design_view` event. |
| **Capture quick / stitched / high-res** | Three resolutions of street-map capture. Quick (~800px) for instant pan feedback, Stitched (~7200px) for the live preview, High-res (~10800px) for downloads. |
| **POI** | Point of Interest — map labels for shops, museums, etc. Filtered to heritage subclasses for the realistic style. |
| **Fineline** | A design style where the inner shape outline is rendered as parallel double lines. Width controlled by `finelineWidth`. |

---

## 24. Session Learnings — Debugging Stories & Architectural Decisions

This section captures hard-won knowledge from real debugging sessions. Each subsection describes a concrete problem, the wrong turns taken, the root cause, and the eventual fix. Read these before touching the related code — they document subtleties that are not obvious from reading the source.

---

### 24.1 SVG drag interactions and Z-order (the shape/map/pin coexistence problem)

**Problem:** In street-map mode, the user needs to be able to:
1. Drag the **shape** (heart/circle/house) to reposition the entire map+shape.
2. Drag the **map image inside the shape** to pan the map content within the shape.
3. Drag the **location pin** independently.

These three drag handlers compete for the same screen real estate.

**First failed attempt — `pointer-events: none` + edge ring:**
The idea was to make the map image only respond to drags in its center, with an "edge ring" near the shape boundary that fell through to the shape drag. This was implemented by setting `pointer-events: all` on a `fill: none` edge stroke.

**Why it failed:** SVG `pointer-events: all` fires for the geometric **fill area**, not the painted stroke band. Setting `fill: none` doesn't change the hit-testing region — the entire interior of the path still captures clicks.

**Second failed attempt — `pointer-events: none` on the shape rect:**
Tried disabling pointer events on the bounding-box rect when in map mode. Result: shape drag broke entirely.

**Working solution — Z-order flip with `.raise()`:**
SVG hit-testing is paint-order-based — later children win first. So:
1. Append `shapeInteract` (shape drag handler) **first** to `mapLayer`.
2. Append `hitGroup` (map drag handler) **second** with an inset hit area.
3. Append `pinGroup` (pin drag handler) **third**.
4. After construction, call `hitGroupRef.raise()` and `pinGroupRef.raise()` to ensure they paint on top.

The hit area for `hitGroup` is **inset by `MAP_EDGE_ZONE` (44 px)** from the shape boundary. So:
- Cursor near the edge of the shape → falls through `hitGroup` → hits `shapeInteract` → shape drag.
- Cursor in the middle → hits `hitGroup` → map drag.
- Cursor on pin → hits `pinGroup` (raised highest) → pin drag.

**Code location:** `VectorStarMap.tsx`, around lines 360-540.

```ts
const MAP_EDGE_ZONE = 44; // px ring at shape boundary reserved for shape-drag

// Inset hit area construction (heart shape example):
const insetScale = Math.max((mapRadius - MAP_EDGE_ZONE) / mapRadius, 0.5);
hitGroup.append('path')
    .attr('d', userHeartPath)
    .attr('transform', getHeartTransform(insetScale))
    .attr('fill', 'transparent')
    .style('pointer-events', 'all');

// At end of useEffect, raise interactive groups:
if (mapBackgroundImage) {
    if (hitGroupRef) hitGroupRef.raise();
    if (pinGroupRef) pinGroupRef.raise();
}
```

**Lesson:** SVG `pointer-events` is geometry-based, not paint-based. To layer click handlers in SVG, use **document order** (and `.raise()` to reorder after creation), not pointer-events tricks.

---

### 24.2 Heart decoration drag stuck — D3 coordinate space mismatch

**Problem:** The decorative heart below the dedication text wouldn't drag past a small distance — it would seem to "stick" or move at half-speed.

**Root cause:** The original implementation put the drag handler and the scale on the same SVG group:

```ts
// BROKEN — drag and scale on same group
const heartGroup = textLayer.append('g')
    .attr('transform', `translate(${cx}, ${cy}) scale(${heartScale})`)
    .style('cursor', 'move');
heartGroup.call(drag().on('drag', function(event) {
    heartDragAcc += event.dy / previewZoom;
    // ...
}));
```

D3's drag handler projects `event.dx/dy` into the **dragged element's local coordinate space** via `getScreenCTM()`. SVG `transform` attributes (including `scale`) ARE included in `getScreenCTM`. So `event.dy` came back already divided by `heartScale` (which is ~0.5 for a typical 8x10 poster) — meaning every pixel of mouse motion produced 0.5 units of position change, then was further divided by `previewZoom`. The user got 1/4 of the expected drag speed.

**Fix:** Split into two nested groups — outer translate + drag, inner scale + path.

```ts
// FIXED — drag on translate-only group, scale isolated to inner group
const heartOuter = textLayer.append('g')
    .attr('transform', `translate(${cx}, ${cy})`)
    .style('cursor', 'move');

const heartInner = heartOuter.append('g')
    .attr('transform', `scale(${heartScale})`);
heartInner.append('path').attr('d', heartPath).attr('fill', textColor);

heartOuter.call(drag().on('drag', function(event) {
    heartDragAcc += event.dy / previewZoom;  // now correct
    select(this).attr('transform', `translate(${cx}, ${cy + heartDragAcc})`);
}));
```

**Hit area:** the transparent rect for the click target also moved to `heartOuter` and is sized in **un-scaled SVG units** (40 × 40 px). Putting it on `heartInner` would make it 40 × heartScale — too small.

**Lesson:** When using `d3-drag`, the drag handler's coordinate space is the drag target's local space. Never put `scale()` on the same group as the drag attachment unless you want the drag distance scaled by it.

**CSS scale (preview zoom) is different:** `getScreenCTM()` does NOT include CSS transforms. So the `event.dy / previewZoom` correction is still needed regardless.

**Code location:** `VectorStarMap.tsx` ~line 1620.

---

### 24.3 Text position jumps when resizing the shape

**Problem:** When the user dragged the "Heart Size" or "Circle Size" slider, text below the shape would visibly jump ahead of the shape — the text re-rendered at the new position 150ms before the shape image caught up visually.

**Root cause:** The shape sizes are debounced (`debouncedHeartSize = useDebounce(heartSize, 150)`) so the map capture doesn't redo the expensive 4-tile stitch on every slider tick. But the text-rendering useEffect was using the **raw** (un-debounced) sizes in its calculations and dependency array. So:

- Slider moves → `heartSize` updates immediately → text effect re-runs immediately → text jumps to new position.
- 150ms later → `debouncedHeartSize` updates → map captures + redraws → shape catches up visually.

**Fix:** Use the debounced versions in BOTH the calculation and the dependency array of the text effect.

```ts
// In the text-rendering useEffect, around line 888:
const _shapeRadius = maskShape === 'rect' ? 0 :
    _baseRadius * (
        maskShape === 'circle' ? debouncedCircleSize :
        maskShape === 'heart'  ? debouncedHeartSize  :
                                  debouncedHouseSize
    );

// Dependency array:
}, [
    /* ...other deps... */
    debouncedCircleSize, debouncedHeartSize, debouncedHouseSize, maskShape,
    /* ...other deps... */
]);
```

**Lesson:** When two visual layers should update in sync but one is debounced for performance, **both** must use the debounced value. Otherwise you get a tearing effect.

**Code location:** `VectorStarMap.tsx` lines 888 and ~1670.

---

### 24.4 The map zoom slider "doing nothing" — two distinct bugs

**Problem reports (from real screenshots):**
- "Map zoom level seems to be not working" — slider value updates, but the rendered map doesn't change.
- "Definitely not matching when reloaded" — the low-res quick capture and high-res stitched capture showed completely different scales/positions.

**Bug A: `isCapturingRef` blocks user pan/zoom.**

The coordinate-sync `useEffect` in `StreetMapCapture.tsx` was:

```ts
useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (isCapturingRef.current) {
        pendingCaptureRef.current = true;
        return;  // ← BUG: returns without applying jumpTo
    }
    map.jumpTo({ center: [mapCenterLng, mapCenterLat], zoom: Math.min(mapZoom, 20), bearing: mapBearing });
}, [mapCenterLat, mapCenterLng, mapZoom, mapBearing]);
```

When `captureStitched` was running (4 sequential tile jumps, each waiting for `idle` — could take 5-10 seconds), `isCapturingRef.current === true` for the entire duration. During that window, ANY zoom/pan slider change updated the store value but the `map.jumpTo` was skipped. The map never moved → user thought zoom was broken.

**Fix:** Always call `map.jumpTo`, regardless of capture state. The stitch already has `captureVersionRef` to detect mid-stitch position changes and discard the stale result on completion.

```ts
useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (isCapturingRef.current) pendingCaptureRef.current = true;
    map.jumpTo({ center: [mapCenterLng, mapCenterLat], zoom: Math.min(mapZoom, 20), bearing: mapBearing });
}, [mapCenterLat, mapCenterLng, mapZoom, mapBearing]);
```

**Bug B: No `captureQuick` on `moveend` in HEAD version.**

The `moveend` handler was:
```ts
map.on('moveend', () => {
    if (suppressNextMoveendRef.current) { ... return; }
    if (isCapturingRef.current) return;
    if (stitchDebounceRef.current) clearTimeout(stitchDebounceRef.current);
    stitchDebounceRef.current = setTimeout(() => captureStitched(), 1200);
});
```

No instant feedback — the user waited 1200 ms + stitch time (5+ seconds total) for ANY visual change. Restored the missing `captureQuick()` call:

```ts
map.on('moveend', () => {
    if (suppressNextMoveendRef.current) { ... return; }
    if (isCapturingRef.current) return;
    captureQuick();  // ← instant low-res preview
    if (stitchDebounceRef.current) clearTimeout(stitchDebounceRef.current);
    stitchDebounceRef.current = setTimeout(() => captureStitched(), 1200);
});
```

Now the user sees an immediate ~800 px JPEG within ~100 ms, then a full stitched image 1.2 s after they stop interacting.

**Lesson:** When a user-facing control feels broken, check whether the control is gated behind an internal state that the user has no way to know about. Specifically, watch for `isXxxRef.current === true` returns at the top of effects.

**Code location:** `StreetMapCapture.tsx` lines ~430-450 (moveend handler) and ~509-519 (coordinates effect).

---

### 24.5 Low-res / high-res capture scale mismatch (the rejected `captureNative` approach)

**Problem:** When the user reloaded a street-map page, the low-res quick capture would show only a portion of the shape (e.g. the right half of a heart with grey fill in the rest), and the high-res stitched capture would show the correct full content. They didn't match.

**Why the mismatch:**
- `captureQuick` calls `map.triggerRepaint()` to force an `idle` event. But `triggerRepaint` can fire `idle` BEFORE tiles are loaded — the canvas at that moment shows partial/blank tiles. The 800 px JPEG captures whatever is visible at that instant.
- `captureStitched` waits for `areTilesLoaded()` per tile, so it always captures complete content. But it's at zoom+1 with a different geographic span (4 quadrant tiles stitched), and any small drift between "what's in the store" and "what the map is currently showing" causes the high-res result to land at a different pixel position than the low-res preview.

**Attempted fix (rejected):**
Replaced both `captureQuick` and `captureStitched` with a single `captureNative` that captured the natural map canvas at 1200 px without zoom changes or tile jumps:

```ts
const captureNative = useCallback(() => {
    const map = mapRef.current;
    if (!map || isCapturingRef.current) return;
    const tryCapture = () => {
        if (!map.areTilesLoaded()) { map.once('idle', tryCapture); return; }
        if (useStore.getState().isDraggingMapImage) return;
        const out = document.createElement('canvas');
        out.width = out.height = 1200;
        out.getContext('2d')!.drawImage(map.getCanvas(), 0, 0, 1200, 1200);
        onCapture(out.toDataURL('image/jpeg', 0.88));
    };
    if (map.areTilesLoaded()) tryCapture();
    else map.once('idle', tryCapture);
}, [onCapture]);
```

**Why it was reverted:** The user reported "the resolution and scaling for actual print does not load anymore, at all". The simplification removed the path that produces the high-quality 7200 × 7200 stitched capture, breaking print-quality preview. Reverted to the original `captureQuick + captureStitched` pipeline via `git checkout HEAD -- src/components/StreetMapCapture.tsx`.

**Lesson:** When refactoring a capture pipeline, keep ALL existing quality tiers. The 4-tile stitch at zoom+1 isn't just for show — it provides the print-quality preview that justifies the multi-second debounce. Replacing it with a single-canvas snap drops effective resolution by 6×.

**The "matching" issue is a separate concern:** even with both captures in place, the visual snap when the high-res replaces the low-res is jarring. Future fix should focus on making the low-res capture wait for `areTilesLoaded()` (no `triggerRepaint`) so it shows the same content the high-res will eventually show, just at lower resolution.

---

### 24.6 The coordinates `useEffect` and the `captureVersionRef` dance

The street-map capture pipeline has two synchronous mechanisms to keep the visible image in sync with the user's intent:

**Mechanism 1: Zustand subscription incrementing `captureVersionRef`** (line 491+):

```ts
useStore.subscribe((state, prev) => {
    if (state.mapCenterLat !== prev.mapCenterLat ||
        state.mapCenterLng !== prev.mapCenterLng ||
        state.mapZoom !== prev.mapZoom ||
        state.mapBearing !== prev.mapBearing ||
        state.mapStyleUrl !== prev.mapStyleUrl ||
        state.posterType !== prev.posterType ||
        state.mapBgColor !== prev.mapBgColor ||
        state.mapStreetColor !== prev.mapStreetColor ||
        state.mapColorPreset !== prev.mapColorPreset) {
        captureVersionRef.current++;
    }
});
```

**Why a Zustand subscription, not a useEffect?** Zustand's `subscribe` callback fires **synchronously inside `set()`**, before any React re-render. A `useEffect` would only fire after the re-render, leaving a window where an in-flight stitch could complete before the version is bumped — its result would be incorrectly applied.

**Mechanism 2: `captureStitched` checks the version on completion:**
```ts
const startVersion = captureVersionRef.current;
// ...4 tile jumps...
if (captureVersionRef.current !== startVersion) {
    // Position changed mid-stitch — discard result
    if (pendingCaptureRef.current) { pendingCaptureRef.current = false; captureStitched(); }
    return;
}
onCapture(dataUrl);
```

**Combined effect:** the user can change zoom/pan/color rapidly. Any in-flight stitch detects the change synchronously, discards its stale result, and (if `pendingCaptureRef` was set) restarts at the latest position.

**Lesson:** When you need synchronous notification of state changes (e.g. inside an async operation that started before the change), prefer Zustand's `subscribe` over `useEffect`. The latter has a lag of one render cycle.

---

### 24.7 The DB sync workflow — slug-based ID lookup

**Problem:** `scripts/sync-listing-state.cjs` originally hardcoded listing IDs:
```js
// OLD — broken
const LISTINGS = [
    { listing_id: 2, designs: [...] },
    { listing_id: 3, designs: [...] },
];
```

When run on production, this failed with FOREIGN KEY constraint errors because production's listing IDs (3, 4, 5 — autoincrement diverged) didn't match local IDs (2, 3, 4).

**Fix:** look up by slug at runtime:
```js
const LISTINGS_CONFIG = [
    { slug: 'star-map-night-we-met', designs: [...] },
    { slug: 'colored-map-home-street', designs: [...] },
];

const LISTINGS = LISTINGS_CONFIG.map(cfg => {
    const row = db.prepare('SELECT id FROM listings WHERE slug = ?').get(cfg.slug);
    if (!row) { console.log(`SKIP: listing not found: ${cfg.slug}`); return null; }
    return { ...cfg, listing_id: row.id };
}).filter(Boolean);
```

**Why slugs are safe:** `listings.slug` has a UNIQUE constraint and is set deliberately (not autoincrement), so it's stable across environments.

**Lesson:** Never hardcode autoincrement IDs in cross-environment scripts. Always look up by a stable column (slug, name, etc.).

---

### 24.8 Adding new listings — the 7-step workflow that "silently fails" if you skip a step

**Problem:** Created a new colored-map listing (`colored-map-home-street`). Templates were inserted, design groups created — but the listing page showed nothing. The "sync to all sizes" admin button silently did nothing.

**Root cause:** The `listing_templates` join table was missing. The admin UI auto-populates this when creating templates via the admin panel, but scripts must do it explicitly:

```js
// REQUIRED — easy to forget
const ins = db.prepare(
    'INSERT OR IGNORE INTO listing_templates (listing_id, template_id, position) VALUES (?, ?, 0)'
);
for (const tid of templateIds) { ins.run(listingId, tid); }
```

**Without this row:** the listing page's `GET /api/listings/:slug` query (which JOINs templates via listing_templates) returns no templates → page shows empty grid → looks like the listing doesn't exist.

**Position field also matters:** all-zero positions cause sort to fall back to `created_at`. If templates were inserted out of order (e.g. Design002 before Design001), the design cards appear in wrong order. Always set positions explicitly:

```js
const GROUP_ORDER = ['cmhs001-design001', 'cmhs001-design002', ...];
const update = db.prepare('UPDATE listing_templates SET position = ? WHERE template_id = ?');
for (const t of templates) {
    const pos = GROUP_ORDER.indexOf(t.design_group_id);
    if (pos !== -1) update.run(pos, t.id);
}
```

**Lesson:** Three tables involved in a new listing: `templates`, `design_groups`, `listing_templates`. Missing any one of them silently breaks display. Always run `sync-listing-state.cjs` after script-based inserts — it enforces all three.

---

### 24.9 Map preview speed optimizations

A series of changes to make the offscreen MapLibre capture feel snappier:

**Service worker tile cache (`public/tile-sw.js`):**
- Caches `https://tiles.openfreemap.org/*.pbf` with `cache-first` strategy.
- Caches style JSON with `network-first` (changes more often than tiles).
- Cache key includes full URL → different zoom levels are independent entries.
- Registered in `main.tsx`.

**Predictive prefetch:**
After a stitch completes, the offscreen map quietly jumps to adjacent zoom levels and back, warming the SW cache. User-initiated zoom finds tiles already cached → no network wait.

**`preserveDrawingBuffer: true`:**
MapLibre's WebGL context. Required so `getCanvas().toDataURL()` returns valid pixels — without it, the buffer is cleared after each frame.

**Capture debounce timing:**
- `captureQuick` fires immediately on `moveend`.
- `captureStitched` debounced 1200 ms after `moveend` (older code had 2500 ms — too slow).
- Color change debounce: 1200 ms (rapid color picker drag stays smooth).

**The "first load" path:**
`map.on('load', ...)` calls `captureStitched()` directly — no `captureQuick`. This means the FIRST view of a city is always high-res but takes 3-5 seconds to appear. Adding a `captureQuick()` here would give instant feedback at the cost of the visual flash when high-res replaces it.

**Lesson:** Map capture has two tradeoffs to tune: perceived latency (use captureQuick for instant feedback) vs visual quality (captureStitched for sharp text/roads). The current pipeline tries to give both — instant low-res, then high-res 1.2 s later.

---

### 24.10 The shape outline toggle — UI/state coordination

**Problem:** Users wanted to hide the shape outline (the thin border around the heart/circle/etc.) entirely. The width slider went down to 0.5 pt minimum, but no toggle.

**Fix:** Added a "Show Shape Outline" `<Switch>` in `StylePanel.tsx`, bound to the existing `showBorder` field. The width slider is now hidden when `showBorder === false`.

```tsx
// In StylePanel.tsx, around line 175:
<FormControl display="flex" alignItems="center" justifyContent="space-between">
    <FormLabel fontSize="sm" color="gray.700" fontWeight="500" mb={0}>
        Show Shape Outline
    </FormLabel>
    <Switch
        isChecked={showBorder}
        onChange={(e) => setShowBorder(e.target.checked)}
        colorScheme="blue"
    />
</FormControl>
{showBorder && sliderRow('Shape Outline Width', shapeOutlineWidth, ...)}
```

**No store changes needed** — `showBorder` already existed as a field, it just wasn't exposed in the UI.

**Pattern:** before adding a new field for a new toggle, check if an existing field can serve. Most boolean visibility flags have already been added.

---

### 24.11 Location pin disconnected from map drag

**Problem:** When the user dragged the map image within the shape, the location pin (small red heart marker) moved with it, ending up off-screen.

**Root cause:** The pin's position was being computed as `center + locationPinOffset + mapImageOffset`, AND the map drag handler was calling `setLocationPinOffsetX/Y` at drag end (an attempt to keep the pin "anchored" to a real-world location).

**Fix (two parts):**
1. Remove `mapImageOffsetX/Y` from the pin position calculation:
   ```ts
   const pinX = center[0] + locationPinOffsetX;  // was: + mapImageOffsetX
   const pinY = center[1] + locationPinOffsetY;
   ```
2. Remove the `setLocationPinOffsetX/Y` calls from the map drag handler.

**Result:** the pin stays at its user-set position regardless of map drag. The user can drag the pin separately if they want to move it.

**Trade-off:** this is "pin tied to shape" semantics, not "pin tied to a real-world coordinate". The latter would require unprojecting the pin's screen position to lat/lng on each map drag — more correct geographically but more complex.

---

### 24.12 The inline editing portal

**Problem:** Users wanted to double-click text on the poster to edit it in-place, rather than going to the sidebar.

**Implementation:**
1. SVG text element receives a `dblclick` event handler (added inside the text-rendering useEffect).
2. The handler:
   - Computes the screen-space bounding rect of the text element (`getBoundingClientRect()`).
   - Sets `inlineEdit = { field, value, svgEl, editRect, fontFamily, fontSize, uppercase? }`.
   - Sets `setIsInlineEditing(true)` in the store (synchronously via Zustand's set).
   - Hides the original SVG text via `style.visibility = 'hidden'`.
3. React renders an HTML `<input>` portaled to `document.body` at the text's position, with matching font/size/color.
4. On blur or Enter: commits the new value via `setCustomText(field, value)`, sets `inlineEdit = null`, restores SVG text visibility.

**Critical sync:**
The `dblclick` handler is a **D3 native event handler**, not a React event. By the time React's reconciliation runs, the second click of the double-click has already fired. So `MainLayout`'s `handleDoubleClick` (which resets the preview pan) checks `isInlineEditingRef.current` — and that ref is updated **synchronously** via a Zustand subscription, not via useEffect:

```ts
// In MainLayout — synchronous ref update
useEffect(() => {
    return useStore.subscribe((state) => {
        isInlineEditingRef.current = state.isInlineEditing;
    });
}, []);
```

If this used `useEffect(() => { ref.current = isInlineEditing }, [isInlineEditing])`, the ref would update after React's render — too late for the in-flight dblclick event.

**Lesson:** D3 native events run before React's render. Any state that needs to be readable in those handlers must be propagated via a synchronous mechanism (refs updated by Zustand subscribe, or `useStore.getState()` direct reads).

---

### 24.13 Active typography field — clicking text auto-switches sidebar tab

**Behavior:** Clicking any text element on the poster (single click, not double) auto-opens the Typography panel with the corresponding tab active. E.g. clicking "The Night We Met" opens the Title tab.

**Implementation:**
- Each text row's drag handler calls `setActiveTypoField('title' | 'subtitle' | ...)` on mousedown.
- The store has `activeTypoField` AND `typoFieldVersion`. The version is incremented every call so even repeat clicks (same field clicked twice) trigger the useEffect that switches the sidebar tab.
- `TypographyPanel.tsx` watches `activeTypoField + typoFieldVersion` to set the active accordion section.

**Why the version field?**
Without it, clicking the title twice would set `activeTypoField = 'title'` both times — no state change, no useEffect re-run, sidebar wouldn't re-open if the user closed it.

**Lesson:** When state changes need to trigger a re-action even on no-op writes, add a version counter that always increments. Common pattern for "imperative" state inside a declarative store.

---

### 24.14 Auto-load Design001 on `/`

**Problem:** When the user landed on `/` (no template URL), the page showed the Zustand defaults — `title = "My Star Map"`, etc. — which is not a finished design. Looked unprofessional.

**Fix in `MainLayout.tsx`:**
```ts
useEffect(() => {
    if (templateId || slug) return;  // template/listing URL takes precedence
    fetch(`${API}/api/templates`)
        .then(r => r.json())
        .then(async (rows) => {
            const starmaps = rows.filter(r => r.design_group_id && (r.posterType ?? 'starmap') === 'starmap');
            const design001 = starmaps.find(r => /-design001$/i.test(r.design_group_id || '')) || starmaps[0];
            if (design001) {
                await fetchAndApplyTemplate(design001.id, { designGroupId: design001.design_group_id });
            }
            setTemplateLoading(false);
        });
}, []);
```

**`templateLoading` starts true** so the loading spinner shows immediately and the bare defaults never flash.

**Autosave restore is offered AFTER template load:** if the user has a recent autosave, a Toast prompts them to restore. The autosave overrides the loaded Design001.

**Lesson:** "First impression" pages need a default state that makes sense. Loading from the API is acceptable (~200 ms with the spinner) — flashing bare defaults is not.

---

### 24.15 Share links via `?d=` query parameter

**Use case:** users can copy a shareable URL that encodes the entire current design state. Recipients see exactly the same poster.

**Implementation:**
- `?d=` value is `btoa(JSON.stringify(designSnapshot))` — base64-encoded JSON, ~3-5 KB typical.
- `MainLayout.tsx` decodes and applies it on mount, before any template/listing loading.
- If the URL is `/l/:slug?d=...`, the listing loads first (for the design picker), then the `?d=` state overrides the template defaults.

**Two layers of `?d=`:**
- The full-state share link (described above) — `?d=base64state`, decoded inline.
- A separate database-backed token system: `POST /api/save-design` returns `{ token }`, the URL becomes `?d=<token>`, recipient GETs `/api/design/:token` to fetch full state.

The token-based path is for very long state strings (some designs hit URL length limits) and for analytics. The inline base64 path is the default.

**Code:** `MainLayout.tsx` lines 165-282 (inline decode), `DownloadButton.tsx` (encode for share button).

---

### 24.16 The thumbnail cache-bust pattern (`?v=N`)

**Problem:** Browsers + CloudFront aggressively cache `/designs/SM001/Design001/8x10.png`. When we update the thumbnail, users keep seeing the old version for hours/days.

**Fix:** every img src includes a `?v=N` query string:
```tsx
<img src={`${API}${thumbSize.thumbnail_path}?v=4`} />
```

When thumbnails change, increment N in `SidebarControls.tsx` AND `ListingPage.tsx`. Users' browsers see a "new" URL and refetch.

**Why not file hashing?** Thumbnails are content-managed (uploaded by the admin), not build artifacts. Vite can't hash them. Manual versioning is simpler than building a hash mechanism.

**Why two files?** Both render the design grid in different contexts (sidebar vs listing page). Both must be bumped together, otherwise one shows the old image.

---

### 24.17 The `--exclude='designs/'` rsync rule

**Problem:** First production deploy after adding thumbnails: rsync `--delete` wiped `/var/www/poster-studio/designs/` because those files don't exist in `dist/`.

**Why it happened:** Thumbnails are stored under `public/designs/` in source. Vite copies `public/*` to `dist/` during build... but the build was set up to skip `public/designs/` because of size. So `dist/` never had thumbnails, and `rsync --delete` wiped them on prod.

**Fix:** every deploy command in CLAUDE.md and HANDOVER.md uses:
```bash
rsync -avz --delete --exclude='designs/' dist/ ubuntu@3.107.34.169:/var/www/poster-studio/
```

**Lesson:** When deploying to a directory that contains both build artifacts AND user-managed content, ALWAYS exclude the user content from `--delete`. Better still, use separate directories.

---

### 24.18 Recurring patterns — what to look for

When debugging an issue in this codebase, common root causes:

| Symptom | Likely cause |
|---------|--------------|
| Slider value updates but visual doesn't change | An effect's `if (someRef.current) return;` is short-circuiting |
| Two layers visually out of sync | One uses debounced value, the other uses raw |
| SVG drag handler at wrong scale | Element has `scale()` transform; D3 projects through it |
| SVG drag at half/double speed in zoomed preview | Forgot to divide `event.dy` by `previewZoom` |
| New design doesn't appear on listing page | Missing `listing_templates` rows |
| Design cards in wrong order | All `listing_templates.position` are 0; sorted by `created_at` instead |
| Wrong fonts in PNG export | `font-family` stack not split on comma in `collectUsedFontFamilies` |
| Thumbnails wiped after deploy | rsync without `--exclude='designs/'` |
| Listing IDs don't match prod | Hardcoded autoincrement IDs in scripts (use slug lookup) |
| Map appears at wrong zoom in preview | `mapBackgroundImage` is stale (older capture); user expects new capture |
| Capture takes forever | `captureStitched` chained to itself via `pendingCaptureRef` infinite loop |
| Inline editing doesn't open | `isInlineEditingRef` not synced via Zustand subscribe (using useEffect instead) |
| Etsy API returns 401 | `x-api-key` header missing the colon-separated `keystring:secret` format |
| Render output too small (<300 KB) | Font embedding failed — check `FONT_REGISTRY` for the family |

---

### 24.19 Architectural decisions — why things are the way they are

**Why one giant Zustand store instead of slices?**
- Easy to grep — `useStore.getState().mapZoom` works from anywhere.
- Undo/redo is simpler with a flat snapshot.
- ~150 fields is manageable; the alternative (per-slice stores) would split tightly-coupled state (e.g. `posterColor` and `mapStyleUrl` are related but in different slices).

**Why D3 + useEffect, not declarative React for the SVG?**
- Updating 200+ SVG circles via React re-renders is too slow.
- D3's drag/zoom utilities are mature and battle-tested.
- The renderer only depends on the store, so it's pure-ish anyway.

**Why MapLibre offscreen, not visible?**
- The user-visible "map" is actually an SVG `<image>` containing a JPEG snapshot — the SVG poster is the real surface.
- MapLibre is rendered into a hidden 1200×1200 div and snapshotted on `idle`/`moveend`.
- This unifies all three poster modes (starmap, streetmap, coloredmap) under one renderer (`VectorStarMap`).

**Why three capture resolutions instead of one?**
- `captureQuick` (800px) gives instant feedback during pan/zoom — too small for print but fine for live preview.
- `captureStitched` (7200px) is the live preview quality — sharp roads/text, but expensive (4 tile jumps).
- `captureHighRes` (10800px) is for the 300 DPI export — only triggered on download, takes ~8 s.

**Why a separate `customText` sub-object in the store?**
- A template defines a default `location: "PARIS"`. The user types over it: `"Brussels"`. Then they switch templates — should the new template's default replace the user's text? Or should "Brussels" persist?
- Answer: depends on context. `customText.location` is the user-typed override. `state.location` is the template default. The render uses `customText.location || state.location`.
- This lets us reset `customText.location = ''` on template change (template default takes effect) but preserve `customText.location = 'Brussels'` on size change (user keeps their text).

**Why server-side render via Puppeteer/Lambda instead of canvas API?**
- The poster is an SVG with embedded fonts. Producing an identical PNG from Node.js without a browser is hard (canvas + node-canvas + custom font loaders).
- Puppeteer just loads `/render/:token` (a real React page) and screenshots it. Pixel-perfect by definition.
- Lambda variant is for when t3.micro can't fit Puppeteer (memory).

**Why d3-celestial via CDN, not bundled?**
- The data files are large (~10 MB total).
- Most users never need it (street/colored map users).
- CDN delivery + browser cache means the cost is paid once per user.

**Why SQLite, not Postgres?**
- Single VPS, single writer.
- WAL mode handles read concurrency.
- Backup is `cp db.sqlite backup-$DATE.sqlite`.
- Migration to Postgres is straightforward if scale demands it.

---

### 24.20 What still needs tribal knowledge captured

These are areas where the actual code remains the source of truth — read it directly:

- The exact dependency arrays of the three big useEffects in `VectorStarMap.tsx` (60+ items each).
- The full set of ~30 setters in `useStore.ts` — most are trivial but `setPosterType`, `setPrintSize`, `setMapColorPreset` have non-trivial side effects.
- The `customText` reset rules in `applyTemplate.ts` — when does each field reset, when does it preserve.
- The exact MapLibre style JSON for both `createMapStyle` (2-color) and `createDesign2Style` (rectangle template).
- The full list of `STYLE_SYNC_FIELDS` in `server/routes/templates.js`.
- The HMAC signature format for download URLs in `server/routes/download.js`.
- The exact shape of `events` props per event name in `analytics.ts`.

For tasks touching these, **read the code first** — don't trust memory or summary docs.

---

## Appendix A: File-by-file size reference

```
src/components/VectorStarMap.tsx      1819 lines  ← largest, the SVG renderer
src/store/useStore.ts                  915 lines  ← Zustand store
src/components/SidebarControls.tsx     841 lines
src/components/StreetMapCapture.tsx    604 lines  ← MapLibre wrapper
src/components/MainLayout.tsx          ~860 lines
src/components/VerifyOrder.tsx         361 lines
src/admin/adminApi.ts                  323 lines
src/utils/applyTemplate.ts             218 lines
src/utils/applyTemplate.test.ts        218 lines
src/components/TemplateSelector.tsx    203 lines
src/utils/renderPoster.ts              185 lines
src/components/PrivacyPolicy.tsx       118 lines
src/components/WelcomeModal.tsx        127 lines
src/utils/fontRegistry.ts              ~97 lines
src/utils/geocode.ts                   ~94 lines
src/utils/astronomy.ts                 ~27 lines
src/utils/analytics.ts                 ~26 lines
src/hooks/useDebounce.ts               ~25 lines
```

## Appendix B: Recommended order to read the code

If you (the AI agent) have a vague task and want to ramp up:

1. `CLAUDE.md` — project rules + known gotchas.
2. `HANDOVER.md` — failure modes (bugs that have already been hit).
3. This file — code-level walkthrough.
4. `src/store/useStore.ts` — understand state shape.
5. `src/components/MainLayout.tsx` — understand the page lifecycle.
6. `src/components/VectorStarMap.tsx` — understand the renderer.
7. `src/utils/applyTemplate.ts` — understand the template data flow.
8. The relevant route file in `server/routes/` for any backend task.
9. `scripts/sync-listing-state.cjs` — DB invariants.

For a specific task, always also `grep` for the field name(s) you're touching, since many fields appear in 8-10 places (store, applyTemplate, renderer, sidebar, server sync).

---

## Appendix C: Quick Reference — "Where do I change X?"

| Want to change... | Edit... |
|-------------------|---------|
| Layout / split pane | `MainLayout.tsx` |
| Add a poster element | `VectorStarMap.tsx` (renderer) + `useStore.ts` (state) + `SidebarControls.tsx` or panel (UI) + `applyTemplate.ts` (persistence) |
| Map color preset | `mapPresets.ts` |
| Map style (roads, water, etc.) | `StreetMapCapture.tsx` `createMapStyle` |
| Sidebar control | One of `src/components/sidebar/*.tsx` |
| Fonts in dropdown | `SidebarControls.tsx` `TITLE_FONTS` etc. |
| Custom font (full registration) | §18 — 4 steps |
| Print sizes | `applyTemplate.ts` `PRINT_SIZE_MAP` |
| Default values for new field | `applyTemplate.ts` `TEMPLATE_FIELD_DEFAULTS` |
| Server route | `server/routes/*.js` |
| DB schema | `server/db.js` (add CREATE + idempotent ALTER) |
| Background job cadence | `server/index.js` (cron) or `server/services/renderQueue.js` (POLL_INTERVAL_MS) |
| Etsy API behavior | `server/services/etsy.js` |
| Render dispatch chain | `server/services/render.js` |
| Visual A/B test | Different `designSlug` URLs in different ads |

---

This document is a living artifact. When you make significant architectural changes, update this file alongside `CLAUDE.md` and `HANDOVER.md`. Treat outdated documentation as a bug.
