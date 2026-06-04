# HANDOVER — The Mapped Moment (Poster Studio)

> For AI coding agents (Claude Code, Cursor, Copilot Workspace, Devin, etc.)
> Last updated: 2026-04-11

Read this file before touching anything. The bugs in here have already cost hours — read the "Known Failure Modes" section before you make assumptions.

> **Latest session handoff:** [docs/HANDOVER-2026-06-04-shop.md](docs/HANDOVER-2026-06-04-shop.md) —
> size-lock fix, digital size-unlock, order confirm-mode, 30-day edit window, inbound message triage,
> listing-copy audit + Etsy push, and the remaining user actions (Gmail forward, publish drafts, delete
> stray listing). Changes are deployed to prod but mostly uncommitted in git.

---

## 1. What This Project Is

**The Mapped Moment** is a custom poster design tool + Etsy storefront for selling personalized star maps, street maps, and colored maps as digital downloads and physical prints.

**Business model:**
- Customer finds listing on Etsy → buys digital download ($12-20) or physical print ($25-45)
- Customer visits themappedmoment.com/verify → enters Etsy order number
- System verifies purchase via Etsy API → renders poster → delivers download link or sends to print fulfillment
- For digital: customer gets 300 DPI PNG download (link valid 7 days, 3 free revisions)
- For prints: system uploads to Printify → ships to customer

**Revenue so far:** $0 — shop is connected; catalog is now 4 draft listings (Star Map, Couple Map, Heart Map, Home/Street Map) across 9 design groups, pending mockup images and publish.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite + React 19)            │
│                                                          │
│  Public Routes:                                          │
│    /              → MainLayout (poster designer)         │
│    /t/:id         → Designer pre-loaded with template    │
│    /l/:slug       → Listing collection page              │
│    /:slug         → Redirects to /l/:slug (bare slugs)   │
│    /verify        → Order verification + download        │
│    /gallery       → Template gallery (public)            │
│                                                          │
│  Admin Routes (/admin/*):                                │
│    /admin/login      → JWT auth                          │
│    /admin/dashboard  → Overview stats + revenue panel    │
│    /admin/orders     → Order management + bulk actions   │
│    /admin/queue      → Render queue status               │
│    /admin/templates  → Template CRUD + editor            │
│    /admin/listings   → Collection management             │
│    /admin/design-editor/:id → Design editor              │
│    /admin/etsy       → Etsy shop sync                    │
│    /admin/analytics  → Event log                         │
│    /admin/assets     → Image uploads + font management   │
│    /admin/settings   → Config                            │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    BACKEND (Express 5 + SQLite)           │
│                                                          │
│  server/index.js          → Main entry, route mounting   │
│  server/db.js             → Schema, migrations, seeds    │
│  server/middleware/auth.js → JWT auth middleware         │
│                                                          │
│  Routes:                                                 │
│    /api/designs           → Save/load poster designs     │
│    /api/verify-order      → Etsy order verification      │
│    /api/order-status      → Poll render status           │
│    /api/download-file/:id → Signed file download         │
│    /api/templates         → Template CRUD                │
│    /api/listings          → Public listing collections   │
│    /api/admin/orders      → Order management (authed)    │
│    /api/admin/settings    → Settings CRUD (authed)       │
│    /api/admin/assets      → File upload (authed)         │
│    /api/admin/etsy        → Etsy API proxy (authed)      │
│    /api/webhooks          → Printify/Etsy webhooks       │
│    /api/analytics         → Event ingestion              │
│    /auth/etsy             → OAuth 2.0 PKCE flow          │
│                                                          │
│  Services:                                               │
│    server/services/etsy.js      → Etsy API client       │
│    server/services/render.js    → Render dispatch        │
│    server/services/renderQueue.js → Async job queue     │
│    server/services/printify.js  → Print fulfillment      │
│    server/services/email.js     → Nodemailer             │
│                                                          │
│  Background Jobs:                                        │
│    - Render queue worker (continuous)                    │
│    - Etsy order polling (every 2 min)                    │
│    - Daily seller digest email (8 AM cron)               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE                        │
│                                                          │
│  AWS EC2 t3.micro (ap-southeast-2, Sydney)               │
│  Ubuntu 24.04 · IP: 3.107.34.169                       │
│  Domain: themappedmoment.com (Let's Encrypt SSL)         │
│  Nginx: reverse proxy port 3001 → Express                │
│  Systemd: poster-studio-api.service                      │
│  SQLite DB: /home/ubuntu/poster-studio/server/data/      │
│  Renders:   /home/ubuntu/poster-studio/server/data/renders/ │
│  Thumbnails: /var/www/poster-studio/designs/             │
│  Frontend:  /var/www/poster-studio/ (static, nginx)      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Known Failure Modes (Read This First)

These bugs have already been hit. Do not repeat them.

### A. Font rendering in PNG downloads

**Symptom:** Downloaded PNG shows wrong fonts (e.g. generic sans-serif instead of Title001).

**Root cause:** `src/utils/renderPoster.ts` → `collectUsedFontFamilies()` reads `font-family` attributes from the SVG. The SVG sets these as stacks like `"Title001, serif"`. The old code treated the whole string as a lookup key against `FONT_REGISTRY` — found nothing — skipped font embedding — browser fell back to system fonts.

**Fix applied:** Split on comma first:
```ts
for (const part of ff.split(',')) {
    const name = part.trim().replace(/^['"]|['"]$/g, '');
    if (name) families.add(name);
}
```

**How to verify:** After any change to rendering, run the font test:
```bash
node scripts/test-font-render.cjs
# Output: /tmp/font-verify-render.png — check visually that fonts match preview
# Also check file size: with embedded fonts ~400KB, without ~150KB
```

### B. Design thumbnails showing gray circle (no stars)

**Symptom:** Thumbnail in the sidebar design card shows a gray circle instead of stars.

**Root cause:** D3-celestial data fetches async from GitHub CDN. Taking a screenshot immediately captures the placeholder state. You must wait for `svg.querySelectorAll('circle').length > 100` before screenshotting.

**Fix:** Always use `scripts/capture-thumbnails.cjs` which waits for >100 SVG circles before capturing. Never screenshot immediately after navigation.

**Local vs production mismatch:** `public/designs/` (served locally by Vite) and `/var/www/poster-studio/designs/` (served by nginx on prod) are separate directories. Updating one does not update the other. Always:
1. Capture thumbnail → save to `public/designs/SM001/DesignXXX/8x10.png`
2. Also `scp` to production `/var/www/poster-studio/designs/SM001/DesignXXX/8x10.png`
3. The `?v=N` cache-bust param in the img src must be incremented when thumbnails change

### C. DB state drift between local and production

**Symptom:** Something works locally but not on production (or vice versa), even after deploying code.

**Root cause:** Template `settings_json` fields (`printSize`, `titleAllCaps`), `thumbnail_path`, and `listing_templates` rows are in the DB — not in code. Making DB changes locally doesn't affect production, and vice versa.

**Fix:** Always use the sync script as the single source of truth:
```bash
# After any DB state change:
node scripts/sync-listing-state.cjs                         # verify local
node scripts/sync-listing-state.cjs --db /home/ubuntu/poster-studio/server/data/db.sqlite  # not possible remotely

# Instead, run on prod:
scp scripts/sync-listing-state.cjs ubuntu@3.107.34.169:/home/ubuntu/poster-studio/scripts/
ssh ubuntu@3.107.34.169 "node /home/ubuntu/poster-studio/scripts/sync-listing-state.cjs \
  --db /home/ubuntu/poster-studio/server/data/db.sqlite"
```

**What drifted in the past:**
- `printSize` in `settings_json` must equal `fulfillment_size` — they drifted when templates were edited without syncing
- `titleAllCaps` was `true` on all Design001 templates on production (wrong — it's false for Design001)
- `thumbnail_path` was `null` for all Design002 templates in DB
- A1/A2/A5 rows were missing from `listing_templates` for both designs

### D. rsync wiping the designs/ thumbnail directory

**Symptom:** Thumbnails disappear from production after a frontend deploy.

**Root cause:** `rsync --delete` removes files on the destination that don't exist in the source. The `dist/` build output doesn't include `public/designs/` (those are user-managed files, not build artifacts).

**Fix applied:** Always use `--exclude='designs/'` in rsync:
```bash
rsync -avz --delete --exclude='designs/' dist/ ubuntu@3.107.34.169:/var/www/poster-studio/
```
This is already in CLAUDE.md deploy commands. Do not remove it.

### E. printSize field corruption

**Symptom:** A template opens at the wrong print size in the designer.

**Root cause:** `printSize` in `settings_json` must match the template's `fulfillment_size` column. When admin saves a template, if the `printSize` is not set correctly it persists the wrong value. Past corruption: 8x10 had `printSize=16x20`, 5x7 had `printSize=8x10`, a1 had `printSize=18x24`.

**Fix:** `sync-listing-state.cjs` enforces `printSize === fulfillment_size` and will fix any corruption. Run it after any admin template editing session.

### F. Design card thumbnail aspect ratio inconsistency

**Symptom:** Design cards in the sidebar show different aspect ratios depending on which design is displayed.

**Root cause:** The old code used `group.sizes[0]` to determine which thumbnail to show and what aspect ratio to render the card at. `sizes[0]` might be 5x7 (5:7 ratio) for one design and 8x10 (4:5 ratio) for another.

**Fix applied:** Always use the 8x10 thumbnail for design cards with a hardcoded `aspectRatio: '4/5'`:
```tsx
const thumbSize = group.sizes.find(sz => sz.fulfillment_size === '8x10') ?? group.sizes[0];
// ...
style={{ aspectRatio: '4/5', objectFit: 'cover' }}
```

---

## 4. Database Schema (SQLite)

```sql
-- Key tables (see server/db.js for full DDL)

designs       (token TEXT PK, state_json TEXT, render_path TEXT, created_at)
orders        (id INTEGER PK, etsy_receipt_id TEXT, token TEXT, listing_type TEXT,
               print_size TEXT, status TEXT DEFAULT 'pending', price_cents INTEGER,
               render_path TEXT, printify_order_id TEXT, etsy_buyer_name TEXT,
               etsy_buyer_email TEXT, ship_address_json TEXT, seller_notes TEXT,
               revisions_used INTEGER DEFAULT 0, fulfilled_at INTEGER, created_at)
templates     (id TEXT PK,  -- e.g. 'sm001-design001-8x10'
               name TEXT, description TEXT, fulfillment_size TEXT, sell_price_cents INTEGER,
               design_group_id TEXT, settings_json TEXT, thumbnail_path TEXT,
               is_active BOOLEAN DEFAULT 1, created_at, updated_at)
render_queue  (id INTEGER PK, order_id INTEGER, token TEXT, status TEXT DEFAULT 'pending',
               attempts INTEGER DEFAULT 0, error TEXT, created_at, processed_at)
settings      (key TEXT PK, value TEXT)
assets        (id INTEGER PK, type TEXT, filename TEXT, file_path TEXT, metadata TEXT, created_at)
listings      (id INTEGER PK, slug TEXT UNIQUE, name TEXT, description TEXT,
               banner_image TEXT, is_active BOOLEAN DEFAULT 1, fulfillment_type TEXT,
               base_price_cents INTEGER, etsy_listing_id TEXT, created_at, updated_at)
listing_templates (listing_id INTEGER, template_id TEXT, position INTEGER,
                   PRIMARY KEY(listing_id, template_id))
events        (id INTEGER PK, name TEXT, props TEXT, session_id TEXT, created_at)
order_events  (id INTEGER PK, order_id INTEGER, type TEXT, label TEXT, detail TEXT, created_at)
```

**Template ID convention:** `{collection}-{designGroup}-{size}` — e.g. `sm001-design001-8x10`.
The collection prefix (`sm001`), design group (`design001`), and size suffix (`8x10`) are used by the frontend to group templates into design cards and size selectors.

**Order statuses:** `pending` → `rendering` → `sent` (digital) or `fulfilled` (print). Also: `pending_manual` (no renderer configured), `failed` (3 retry attempts exhausted).

**price_cents:** Populated from `receipt.grandtotal.amount` when the order is first created in `server/routes/verify.js`. Used by the admin dashboard revenue panel.

---

## 5. The Design/Listing Creation Workflow

This is the process for creating new designs and making them available on the listing page. Follow it exactly to avoid the failures described in Section 3.

### Step 1: Create templates in the admin panel OR via script

**Via admin UI** (`/admin/templates` → New Template): automatically populates `templates` AND `listing_templates`. Preferred for one-off designs.

**Via script** (for bulk multi-size creation): you must insert into **three** tables or the listing page won't show the design and sync-to-siblings silently fails:

```js
// 1. design_groups — links the group to a listing
db.prepare(`INSERT INTO design_groups (id, listing_id, name, ...) VALUES (...)`).run(...);

// 2. templates — one row per size
db.prepare(`INSERT INTO templates (id, design_group_id, fulfillment_size, ...) VALUES (...)`).run(...);

// 3. listing_templates — REQUIRED JOIN TABLE, commonly missed when scripting
//    Without this: listing page omits the design, sync-to-siblings fails silently
const ins = db.prepare(`INSERT OR IGNORE INTO listing_templates (listing_id, template_id, position) VALUES (?, ?, 0)`);
for (const tid of templateIds) { ins.run(listingId, tid); }
```

ID convention: `{collection}-{design}-{size}` (e.g. `sm001-design003-8x10`)  
`fulfillment_size` must exactly match the size suffix in the template ID.

### Step 2: Sync printSize (critical)

After saving templates, run the sync script to enforce `printSize === fulfillment_size`:
```bash
node scripts/sync-listing-state.cjs
```
Add the new design group to `DESIGNS` array in `scripts/sync-listing-state.cjs` first.

### Step 3: Capture thumbnails

```bash
# Update capture-thumbnails.cjs with the new templateId and expectedTitle
node capture-thumbnails.cjs
# Visually inspect output images before deploying
```

**Required checks before accepting a thumbnail:**
- Does it show real stars (not gray circle)?
- Is the title text correct and in the right case?
- Is it 4:5 aspect ratio (592×740 or equivalent)?
- Does it match the live preview at `localhost:5173/t/{templateId}`?

### Step 4: Place thumbnails in both locations

```bash
# Local (for Vite dev server)
cp /tmp/thumb-newdesign.png public/designs/SM001/Design003/8x10.png

# Production
scp /tmp/thumb-newdesign.png ubuntu@3.107.34.169:/var/www/poster-studio/designs/SM001/Design003/8x10.png
```

### Step 5: Update DB thumbnail_path and listing_templates

Edit `scripts/sync-listing-state.cjs` — add the new design group to `DESIGNS` and add its group prefix to the relevant listing in `LISTINGS`. Then:

```bash
# Apply locally
node scripts/sync-listing-state.cjs

# Apply on production
scp scripts/sync-listing-state.cjs ubuntu@3.107.34.169:/home/ubuntu/poster-studio/scripts/
ssh ubuntu@3.107.34.169 "node /home/ubuntu/poster-studio/scripts/sync-listing-state.cjs \
  --db /home/ubuntu/poster-studio/server/data/db.sqlite"
```

### Step 6: Increment thumbnail cache-bust version

In `src/components/SidebarControls.tsx` and `src/components/ListingPage.tsx`, find `?v=N` on thumbnail img src and increment N:
```tsx
src={`${API}${thumbSize.thumbnail_path}?v=3`}  // was ?v=2
```

### Step 7: Build and deploy

```bash
npm run build
rsync -avz --delete --exclude='designs/' dist/ ubuntu@3.107.34.169:/var/www/poster-studio/
```

### Step 8: Visual verification (mandatory)

Use the Playwright-based visual check:
```bash
node scripts/verify-listing.cjs
# Saves /tmp/verify-local.png and /tmp/verify-prod.png
# Check that both show correct thumbnails with stars
```

---

## 6. Font System

### How fonts work in the browser (preview)
Fonts are declared in `src/assets/fonts/fonts.css` via `@font-face`. Vite bundles the woff2 files. The browser loads them normally. Custom fonts: `Title001`, `Details001`, `Mapped2`, `MappedMomentScript`, and ~25 others.

### How fonts work in PNG downloads (critical)
When the user clicks "Download Preview", `src/utils/renderPoster.ts` serializes the SVG to a blob URL and draws it on a Canvas. **Blob-URL SVGs cannot resolve relative `@font-face` src URLs** — the browser's security model blocks it.

**Solution:** `src/utils/fontRegistry.ts` uses Vite `?url` imports to get hashed absolute paths for every font file at build time. `renderPoster.ts` fetches each used font as a base64 data URI and injects inline `@font-face` rules into the SVG before serialization.

**The gotcha:** SVG `font-family` attributes are stacks like `"Title001, serif"`. Must split on comma before looking up in `FONT_REGISTRY`. The fix is in `collectUsedFontFamilies()` in `renderPoster.ts`.

### Adding a new custom font to the render pipeline
1. Add the `.woff2` file to `src/assets/fonts/`
2. Add `@font-face` to `src/assets/fonts/fonts.css`
3. Add a Vite `?url` import and registry entry to `src/utils/fontRegistry.ts`
4. Add the font name to the relevant array in `SidebarControls.tsx` (`TITLE_FONTS`, etc.)

If you skip step 3, the font will show in the browser preview but render as a fallback system font in downloads.

---

## 7. Render Pipeline

### Customer-triggered (verify flow)
1. Customer POSTs to `/api/verify-order` with their Etsy order number
2. Server fetches receipt from Etsy API, validates purchase
3. Design token extracted from receipt personalization note
4. **If digital + design has pre-rendered PNG:** copy PNG, set status='sent', return download URL
5. **If digital + no pre-rendered PNG:** enqueue render job, return `status: 'rendering'`
6. Frontend polls `/api/order-status?etsyOrderId=X` every 5s
7. When render queue worker finishes, it sets `status='sent'` for digital orders
8. Next poll returns download URL

### Server-side render worker
`server/services/renderQueue.js` runs continuously, processes one job at a time.
- Priority chain: Lambda URL → local Puppeteer → pending_manual fallback
- 3 attempts max, exponential-ish retry
- On success for digital orders: promotes to `status='sent'`, sends email
- On exhaustion: sets `status='failed'`

---

## 8. Deployment

### Frontend
```bash
npm run build
rsync -avz --delete --exclude='designs/' dist/ ubuntu@3.107.34.169:/var/www/poster-studio/
```

`--exclude='designs/'` is critical — do not remove it. The `/designs/` directory contains thumbnails that are NOT build artifacts; rsync `--delete` would wipe them.

### Server
```bash
rsync -avz --exclude node_modules --exclude data --exclude .env \
  server/ ubuntu@3.107.34.169:/home/ubuntu/poster-studio/server/
ssh ubuntu@3.107.34.169 "cd /home/ubuntu/poster-studio/server && \
  npm install --production && sudo systemctl restart poster-studio-api && \
  sleep 2 && sudo systemctl is-active poster-studio-api"
```

### DB state
DB state is **not** deployed via rsync. It lives in `/home/ubuntu/poster-studio/server/data/db.sqlite` on the VPS. Use `sync-listing-state.cjs` after any template/listing changes.

### Nginx thumbnail caching
The nginx config has a dedicated `location ^~ /designs/` block with `Cache-Control: no-cache, must-revalidate`. This means thumbnails are re-validated on every request — important for updates to take effect without a full cache purge.

The `?v=N` query param in thumbnail img src is an additional client-side cache buster for browser caches that ignore Cache-Control on images.

---

## 9. Scripts Reference

All scripts are in `scripts/` and run from the project root.

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/sync-listing-state.cjs` | **Single source of truth for DB state.** Enforces printSize, titleAllCaps, thumbnail_path, listing_templates. | `node scripts/sync-listing-state.cjs` |
| `capture-thumbnails.cjs` | Playwright-based poster screenshot for thumbnails. Waits for D3 stars before capturing. | `node capture-thumbnails.cjs` |
| `scripts/test-font-render.cjs` | Renders a poster to PNG via renderPosterToBlob and saves it. Use to verify fonts are embedded. | `node scripts/test-font-render.cjs` |
| `scripts/verify-listing.cjs` | Playwright screenshot of listing page on local + prod. Use to visually confirm thumbnails. | `node scripts/verify-listing.cjs` |

---

## 10. Environment Variables

All in `server/.env` (see `server/.env.example` for template):

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Express port (3001) |
| `APP_URL` | Yes | `https://themappedmoment.com` |
| `DOWNLOAD_SECRET` | Yes | HMAC secret for signed download URLs |
| `JWT_SECRET` | Yes | Secret for admin JWT tokens |
| `ADMIN_PASSWORD_HASH` | Yes | bcrypt hash of admin password |
| `DB_PATH` | Yes | Path to SQLite file |
| `RENDERS_DIR` | Yes | Path for rendered PNGs |
| `CORS_ORIGIN` | Yes | Allowed CORS origin |
| `ETSY_API_KEY` | Yes | Etsy keystring (for OAuth client_id) |
| `ETSY_API_SECRET` | Yes | Etsy shared secret |
| `ETSY_ACCESS_TOKEN` | Auto | Set by OAuth flow, auto-refreshes |
| `ETSY_REFRESH_TOKEN` | Auto | Set by OAuth flow |
| `ETSY_SHOP_ID` | Auto | Set by OAuth flow (12648302) |
| `ETSY_REDIRECT_URI` | Yes | OAuth callback URL |
| `ENABLE_LOCAL_RENDER` | Optional | Set `true` to enable Puppeteer rendering |
| `RENDER_LAMBDA_URL` | Optional | AWS Lambda URL for offloading renders |
| `FRONTEND_URL` | Optional | Used by Puppeteer renderer to load the page |

---

## 11. Key Technical Gotchas

### Etsy API v3 — Header Format
The `x-api-key` header MUST be `keystring:shared_secret` (colon-separated). OAuth `client_id` uses keystring only. See `etsyHeaders()` in `server/services/etsy.js`.

### Three Map Modes
`posterType` controls mode: `starmap` | `streetmap` | `coloredmap`. All share `VectorStarMap.tsx`. Street/colored maps render offscreen via `StreetMapCapture.tsx` → captured as data URL → injected as `<image>` in SVG.

### Template ID Convention
Template IDs follow the pattern `{collection}-{design}-{size}` (e.g. `sm001-design001-8x10`). The frontend splits on the last dash to extract the size code for grouping into design cards and size selectors. Do not deviate from this convention.

### Three DB fields required for templates to display correctly on the listing page
The listing page (`/l/:slug`) shows all templates in `listing_templates`. A template card shows correctly only when ALL THREE of these are set:
1. **`listing_templates` row** — without it the template is invisible (see gotcha below)
2. **`thumbnail_path`** — without it the card shows the template name as fallback text instead of the poster image. Set it to the shared 8x10 thumbnail: `/designs/SM001/Design00N/8x10.png`
3. **`templates.name`** — shown as the card label. Use consistent format `Design00N — {size}` (e.g. `Design004 — 8×10"`). If you create templates via script, double-check the name format matches existing designs. Renaming a `design_group.name` does NOT update template names — those must be updated separately.

### listing_templates is mandatory — scripts commonly miss it
When creating templates via script you touch `design_groups` and `templates`, but the listing page and sync-to-siblings both depend on a third table: `listing_templates (listing_id, template_id, position)`. If this table is missing rows for a design, the design silently disappears from the listing page and sync-to-all-sizes does nothing. Always insert one row per template:
```js
db.prepare('INSERT OR IGNORE INTO listing_templates (listing_id, template_id, position) VALUES (?, ?, 0)')
  .run(listingId, templateId);
```
The admin UI does this automatically; scripts must do it explicitly.

### State Management
`useStore.ts` is a Zustand store with 100+ fields. `DESIGN_FIELDS` lists what's saved to templates. `CUSTOM_TEXT_KEYS` lists what's saved to `customText`. Both arrays must be updated when adding new text elements — see the "New Text Element Checklist" in CLAUDE.md.

### applyTemplate and customText carry-over
`applyTemplate.ts` explicitly resets `customText.title`, `customText.subtitle`, `customText.names`, and `customText.dedication` when switching designs. If you add a new text field, add it to this reset block and to `CUSTOM_TEXT_KEYS`.

### Inline font-family stacks in SVG
SVG text elements get `font-family="Title001, serif"` (with fallback). Any code that reads `font-family` and uses it as a lookup key MUST split on comma first. This applies to `renderPoster.ts` and any future server-side render code.

---

## 12. File-by-File Guide

### Frontend — Core Components

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/VectorStarMap.tsx` | ~1500 | SVG poster renderer. 3 big useEffects: background layer, star/map layer, text layer. Inline editing, drag-to-reposition, resize handles. |
| `src/components/SidebarControls.tsx` | ~2200 | All sidebar controls in accordion sections. Design card grid with thumbnail display. |
| `src/components/StreetMapCapture.tsx` | ~600 | Offscreen MapLibre GL renderer. Capture strategies: captureStitched (quality) + captureQuick (speed). |
| `src/components/MainLayout.tsx` | ~400 | Split-pane layout. Orchestrates StreetMapCapture ↔ VectorStarMap. |
| `src/components/ListingPage.tsx` | ~200 | Public listing collection page. Shows design thumbnails. |
| `src/components/VerifyOrder.tsx` | ~250 | Order verification + status polling. |

### Frontend — Utilities

| File | Purpose |
|------|---------|
| `src/store/useStore.ts` | Zustand store — all poster state + setters + undo/redo |
| `src/utils/applyTemplate.ts` | Apply template settings_json to store state |
| `src/utils/renderPoster.ts` | SVG → PNG blob with embedded fonts for download |
| `src/utils/fontRegistry.ts` | Vite `?url` imports for every woff2 file. Required for font embedding in renders. |
| `src/utils/astronomy.ts` | D3 projection rotation from lat/lng/date/time |
| `src/utils/geocode.ts` | Nominatim API wrapper |

### Backend — Routes

| File | Auth | Key Endpoints |
|------|------|---------------|
| `server/routes/verify.js` | No | `POST /api/verify-order`, `GET /api/order-status`, `GET /api/download-file/:id` |
| `server/routes/templates.js` | Mixed | `GET /api/templates/:id` (public), CRUD (authed), style sync |
| `server/routes/listings.js` | Mixed | `GET /api/listings/:slug` (public list with thumbnails), CRUD + listing_templates (authed) |
| `server/routes/admin-orders.js` | Yes | Orders, status, bulk, CSV, notes, fulfill |
| `server/routes/admin-etsy.js` | Yes | Etsy proxy, listing sync |
| `server/routes/admin-settings.js` | Yes | Settings CRUD |
| `server/routes/admin-assets.js` | Yes | File upload/delete |

### Backend — Services

| File | Purpose |
|------|---------|
| `server/services/etsy.js` | `etsyFetch()` with auto token refresh, order polling |
| `server/services/render.js` | Dispatch to Lambda / local Puppeteer / pending_manual fallback |
| `server/services/renderQueue.js` | Async render job queue. On success: promotes digital orders to 'sent'. |
| `server/services/printify.js` | Upload image, create order, send to production |
| `server/services/email.js` | Poster ready email, daily digest |

---

## 13. Testing

```bash
npm run build && npx playwright test           # all tests (~93 currently passing)
npx playwright test tests/features.test.ts    # specific file
npx playwright test --headed                  # visible browser
npx playwright test --grep "font"             # by title pattern
```

**Important test rules:**
- MapLibre tests need `test.setTimeout(30000)` — tiles are slow
- Never use `waitForLoadState('networkidle')` with MapLibre — tiles never fully settle
- Use `page.waitForSelector('svg', { timeout: 10000 })` for designer tests instead
- All tests use `setupMockApi(page)` from `tests/fixtures/mockApi.ts`

---

## 14. Deployment Checklist

Before every deploy:
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] `npx playwright test` passes (no new failures)
- [ ] Visual check: `node scripts/verify-listing.cjs` — thumbnails look correct
- [ ] DB state: `node scripts/sync-listing-state.cjs` — all consistent
- [ ] Frontend deploy: `rsync -avz --delete --exclude='designs/' dist/ ubuntu@...`
- [ ] Server deploy (if changed): rsync + npm install + systemctl restart
- [ ] DB sync on prod (if listing/template changes): run sync script via ssh
- [ ] Verify at https://themappedmoment.com/l/star-map-night-we-met

After thumbnail changes only:
- [ ] Increment `?v=N` in `SidebarControls.tsx` and `ListingPage.tsx`
- [ ] Copy new thumbnails to `public/designs/` (local) and `/var/www/poster-studio/designs/` (prod)
- [ ] Rebuild and deploy

---

## 15. Server Management

```bash
ssh ubuntu@3.107.34.169

# Service
sudo systemctl status poster-studio-api
sudo systemctl restart poster-studio-api
sudo journalctl -u poster-studio-api -f   # live logs

# DB
sqlite3 /home/ubuntu/poster-studio/server/data/db.sqlite

# Nginx
sudo nginx -t && sudo systemctl reload nginx
# Config: /etc/nginx/sites-enabled/poster-studio

# Thumbnails directory
ls /var/www/poster-studio/designs/
```

---

## 16. Next Steps (Priority Order)

1. **Publish Etsy listings** — Create listing images, publish via admin Etsy page, set `ETSY_DIGITAL_LISTING_IDS` in .env
2. **Enable server-side rendering** — Set `ENABLE_LOCAL_RENDER=true` and `FRONTEND_URL` in production .env, add 2GB swap
3. **End-to-end order test** — Place test order on Etsy, verify render → download works
4. **Prodigi print integration** — `server/services/prodigi.js`, wire into verify flow
5. **Harden production secrets** — Rotate `ADMIN_PASSWORD`, `JWT_SECRET`, `DOWNLOAD_SECRET` to 24+ char random values

---

## 17. Credentials & Secrets

**DO NOT commit secrets to git.** All secrets live in `server/.env` on the VPS.

- Etsy API credentials: see Claude Code memory `memory/etsy_credentials.md`
- Etsy shop: TheMappedMoment, Shop ID: 12648302
- To re-authenticate Etsy: visit `https://themappedmoment.com/auth/etsy`

---

## 18. Print Fulfillment Cost Reference

**Cheapest single-unit options:**
- US small (≤18x24): ShortRunPosters ($2-5 print, no API)
- US large (24x36): Scalable Press ($7.20, has API)
- International: Prodigi or Gelato (local printing in 32+ countries)

**Target Etsy pricing:**
- Digital download: $12.99-19.99 (89% margin)
- Physical 18x24: $39.99 (64% margin at Prodigi rates)

---

## 19. Fulfillment, Profitability & Shipping (2026-06 build)

> Full detail in **CLAUDE.md** sections "Fulfillment & Print Products", "Profitability Guard",
> "Markets/products/shipping", and "Modular architecture". This is the handover summary.

### Platform-agnostic fulfillment
Product type (`digital`/`print`/`framed`) comes from the saved design `orderType` first
(`server/routes/verify.js` `getListingType`, `server/services/etsy.js` `resolveListingType`),
not the sales channel — so Amazon Custom / TikTok can be added by writing an ingestion adapter
that sets `orderType`+`printSize`+`revenue_cents`+`currency` on the order, then calling
`submitPrintOrder`/`releasePrintOrder`. Prodigi is the fulfiller (`server/services/prodigi.js`).

### Profitability guard (never pay Prodigi > customer paid)
`releasePrintOrder()` is the single chokepoint for ALL release paths. It re-quotes Prodigi live
(per destination country/currency) and holds the order in `needs_review` if
`revenue − Etsy fees − Prodigi cost < floor`. Config in `server/services/profitability.js`
(+ `settings`: `etsy_fee_pct`, `etsy_fee_flat_cents`, `min_margin_cents`, `min_margin_pct`).
New `orders` columns: `currency, revenue_cents, shipping_paid_cents, tax_cents, prodigi_cost_cents,
prodigi_ship_cents, margin_cents, profit_status, profit_json`. Admin override:
`POST /api/admin/orders/:id/fulfill {force:true}`; re-quote: `POST /api/admin/orders/:id/assess`.

### Shipping & markets
Markets: **US (free shipping) + Canada + UK + Australia + EU**, all clear $8 floor. Per-country
Prodigi method in `shippingMethodFor()`: US/CA/AU=Budget, GB/EU=Standard (`prodigi_shipping_<ISO>`
to override). **12 live Etsy shipping profiles** (one per size; IDs in prod
`settings.shipping_profile_bap_<size>`), built by `server/scripts/build-shipping-profiles.js`
(dry-run default; `--apply`, `--replace`, `--only-size`, `--no-express`). Each: US free +
CA/GB/AU/EU charged + US-domestic Express upgrade. Paper: BAP (`ART-FAP-BAP-*`) for 10 sizes;
FAP for 5x7 & A5 (BAP not offered). Framing line config `prodigi_frame_line` (default **CFP**).
⚠️ **Etsy shipping profile is per-LISTING, not per-variation** — see "open question" below.

### Modular swap points (config-driven, no code change)
- **LLM** — `server/services/llm.js`, `llm_provider` (openrouter|bedrock|disabled). **ACTIVE =
  openrouter**, model `openrouter/free` (Free Models Router; needs `OPENROUTER_API_KEY` in `.env`).
  Bedrock is a documented fallback that's NOT viable in ap-southeast-2 without cross-region inference
  profiles (3.5 Haiku absent, Claude 3 Haiku Legacy-blocked) — that's why we use OpenRouter.
- **Framing** — `getFramedSku()` in prodigi.js.
- **Fulfiller** — replace prodigi.js (Printify/Gelato have pricing APIs + 30-day reship like Prodigi;
  need monthly sub for cheap rates — revisit at volume).

### Bad-order recovery (`server/services/orderRecovery.js` + `personalizationParser.js`)
When a buyer types details into Etsy's Personalization box (no design code), the Etsy poll prefills
the listing's default template (Design001) with parsed fields → near-finished design to approve.
Deterministic parse + LLM (Haiku) gap-fill. Gated `enable_order_recovery` / `ENABLE_ORDER_RECOVERY`
(default OFF). Tested deterministic live on prod.

### Etsy specifics
- OAuth scopes now include `shops_w listings_w` (`server/routes/auth.js`); re-auth done.
- Production partner "Prodigi" added manually (no create API). Returns policy = "no returns";
  cancellations 24h. EU GPSR: shop is Estonia-based = own economic operator; personalized goods
  exempt from 14-day withdrawal (declared in T&C). Outbound Etsy messages NOT API-able (v3 killed
  messaging) → browser agent only. Inbound email is catch-all → `/api/webhooks/email-inbound`.
- Customer-facing copy: **`LISTING_COPY.md`** (canonical, reusable).

### Helper scripts added (`server/scripts/`)
`build-shipping-profiles.js`, `quote-matrix.js`, `verify-etsy-write.js`, `pricing-table.js`,
`frame-probe.js`, `express-probe.js`, `bedrock-probe.js`. Run on PROD (keys via IMDS/.env).

### OPEN QUESTION for next agent — listing structure vs per-size shipping profiles
We built **one shipping profile per size**, but Etsy attaches **one profile per LISTING** (not per
variation). If listings use **Size as a variation** (one listing, many sizes), a listing can only
carry ONE profile → it can't be size-accurate on the *charged intl* line. This is OK because US is
free (cost baked into each size's price) and intl carries a big margin cushion + the profit guard
backstops — but decide: (a) one listing per size (precise shipping), or (b) size-as-variation with a
single representative profile per listing. Attaching profiles via API = `updateListing` with
`shipping_profile_id` (needs the Etsy listing IDs + this decision).
