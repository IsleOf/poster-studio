# Poster Studio — Agent Handover Map

> Token-lean semantic index for AI agents (Hermes, Claude Code, Cursor, etc.).
> Read this before reading any source file. Use it to locate exactly what you need.

> **Knowledge base (read first):** durable cross-session context lives in the local Obsidian
> second-brain vault on this dev machine (sanitized, no secrets):
> `/mnt/c/Agents/hermes-local/projects/second-brain/` — start at
> `ai-chats/the-mapped-moment/_index.md` (past-session summaries) and
> `codebases/the-mapped-moment/file-map.md` (annotated repo map). After meaningful work, add a
> summary note there + a line in `agent-operations/status.md`. Never write secrets to the vault.

---

## 1. System Overview

Single-seller Etsy print-on-demand storefront. Customers design star-map / street-map posters
in a React SPA, purchase on Etsy, and receive digital downloads or physical prints.

```
Customer browser (React/Vite SPA)
        │  HTTPS
        ▼
  nginx (port 443)  ──►  /api/*  ──►  Node/Express server (port 3001)
        │                                      │
        ▼                                      ▼
  /var/www/poster-studio/               SQLite DB  +  Render Queue
  (static dist/)                         │                │
                                         ▼                ▼
                                   Etsy API v3       Puppeteer/Chromium
                                   Resend email      (headless render)
                                   Prodigi print API
```

**Server:** AWS EC2 t3.micro (1 GB RAM, 2 GB swap), Ubuntu 24.04, Sydney (`ap-southeast-2`)
**Domain:** `https://themappedmoment.com`
**SSH:** `ssh ubuntu@3.107.34.169`
**Service:** `sudo systemctl restart poster-studio-api`
**DB:** `/home/ubuntu/poster-studio/server/data/db.sqlite` (WAL mode)

---

## 2. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React 19 + Vite 7 + TypeScript | Single-file build → dist/ |
| UI | Chakra UI v2 + Tailwind CSS 4 | Dark sidebar, split-pane layout |
| State | Zustand v5 | All design state in one flat store |
| Star maps | D3 + d3-celestial JSON data (CDN) | SVG rendering, no canvas |
| Street maps | MapLibre GL JS v5 + OpenFreeMap tiles | WebGL canvas → capture to PNG |
| Geocoding | Nominatim (free, no key) | `src/utils/geocode.ts` |
| Backend | Node.js 22 ESM + Express 5 | `server/index.js` |
| DB | better-sqlite3 (synchronous) | `server/db.js` |
| Email | Resend SDK + SMTP fallback | `server/services/email.js` |
| Print fulfillment | Prodigi API v4.0 | `server/services/prodigi.js` |
| Render | Puppeteer + bundled Chromium | `server/services/renderLocal.js` |
| Tests | Playwright (local + prod) | `tests/` |

---

## 3. Repository Structure

```
poster-studio/
├── src/                          # Frontend (React/TypeScript)
│   ├── App.tsx                   # Routes: / /d/:token /t/:id /l/:slug /verify /render /admin/*
│   ├── main.tsx                  # React entry, ChakraProvider, service worker registration
│   ├── store/
│   │   └── useStore.ts           # ALL design state + setters (2100+ lines) ← read this first
│   ├── components/
│   │   ├── MainLayout.tsx        # Split-pane layout; loads design from /d/:token; lockedSize param
│   │   ├── VectorStarMap.tsx     # SVG renderer — 3 useEffects: background / map+stars / text
│   │   ├── SidebarControls.tsx   # All sidebar accordion controls (1700+ lines)
│   │   ├── StreetMapCapture.tsx  # Offscreen MapLibre → canvas capture
│   │   ├── PosterRenderPage.tsx  # Headless render target for Puppeteer (/render?token=)
│   │   ├── VerifyOrder.tsx       # Customer order verification + download flow
│   │   ├── ListingPage.tsx       # /l/:slug listing page with design cards
│   │   ├── EmailCaptureModal.tsx # Email capture before first save
│   │   ├── DownloadButton.tsx    # SVG → 300DPI PNG export (NEVER expose PDF here)
│   │   └── sidebar/
│   │       ├── ColorPanel.tsx    # Color pickers — posterColor syncs mapInteriorColor
│   │       └── MapControlsPanel.tsx
│   ├── admin/                    # Admin SPA (requires JWT)
│   │   ├── adminApi.ts           # All admin API calls
│   │   ├── DashboardPage.tsx
│   │   ├── OrdersPage.tsx / OrderDetailPage.tsx
│   │   ├── DesignEditorPage.tsx  # Visual template editor with save/sync
│   │   ├── DesignImportPage.tsx  # Design group + listing creation wizard
│   │   ├── ListingDesignsPage.tsx
│   │   ├── TemplatesPage.tsx / TemplateEditorPage.tsx
│   │   ├── QueuePage.tsx         # Render queue monitor
│   │   └── EtsyPage.tsx / SettingsPage.tsx / AssetsPage.tsx
│   └── utils/
│       ├── renderPoster.ts       # SVG → canvas → PNG blob (fonts embedded as base64)
│       ├── applyTemplate.ts      # Load template settings into store
│       ├── fontRegistry.ts       # Maps font names → Vite-resolved woff2 URLs
│       ├── astronomy.ts          # Lat/lng/date/time → D3 projection rotation
│       └── geocode.ts            # Nominatim API wrapper
│
├── server/                       # Backend (Node ESM)
│   ├── index.js                  # Express app, CORS, helmet, rate limits, cron jobs
│   ├── db.js                     # Schema creation + migrations (ALTER TABLE catch blocks)
│   ├── middleware/
│   │   ├── auth.js               # JWT create/verify, requireAdmin, loginHandler
│   │   └── validate.js           # Zod schemas + validate() middleware factory
│   ├── routes/
│   │   ├── designs.js            # POST /api/save-design, GET /api/design/:token
│   │   ├── verify.js             # POST /api/verify-order, GET /api/download-file/:id, GET /api/order-status
│   │   ├── download.js           # GET /api/download/:token (legacy, no HMAC)
│   │   ├── templates.js          # CRUD /api/templates, /api/admin/templates, sync-to-siblings
│   │   ├── listings.js           # CRUD /api/listings, /api/admin/design-groups (bulk create)
│   │   ├── admin-orders.js       # Admin order management + simulate-order endpoint
│   │   ├── admin-settings.js     # GET/PATCH /api/admin/settings
│   │   ├── admin-assets.js       # Font/image upload + /api/assets/fonts.css (public)
│   │   ├── admin-etsy.js         # Etsy OAuth + listing sync
│   │   ├── email-capture.js      # POST /api/email-capture
│   │   ├── webhooks.js           # POST /api/webhooks/prodigi, /api/webhooks/email-inbound
│   │   ├── analytics.js          # POST /api/events, GET /api/admin/analytics
│   │   └── auth.js               # /auth/* (Etsy OAuth only; admin login is /api/admin/login)
│   └── services/
│       ├── email.js              # sendPosterReadyEmail, sendPrintShippedEmail, sendSellerDailyDigest, etc.
│       ├── etsy.js               # pollAndFulfill, extractToken, fetchNewOrders
│       ├── render.js             # renderOrder → chain: Lambda → local Puppeteer → pending_manual
│       ├── renderLocal.js        # Puppeteer: opens /render?token= headlessly, reads window.__posterPng
│       ├── renderQueue.js        # SQLite-backed queue worker, 10s poll, 3 attempts max
│       ├── prodigi.js            # Prodigi API v4.0: createOrder, fulfillPrintOrder, cancelOrder
│       └── printify.js           # Printify stub (not primary, kept for reference)
│
├── tests/                        # Playwright test suite
│   ├── fixtures/mockApi.ts       # setupMockApi(page) — intercepts all /api/** routes
│   ├── designer.test.ts          # 20 tests — page load, template URLs, SVG structure
│   ├── user-journeys.test.ts     # 40 tests — E2E customer + admin flows
│   ├── features.test.ts          # 30 tests — revenue panel, retry, bulk actions, CSV
│   ├── poster-modes.test.ts      # 50 tests — star/street/colored map, shapes, zoom
│   ├── designer-controls.test.ts # 60 tests — all sidebar accordion controls
│   ├── error-states.test.ts      # 35 tests — 404s, network failures, auth errors
│   ├── admin.test.ts             # 55 tests — admin auth, orders, templates, Etsy
│   ├── admin-advanced.test.ts    # 45 tests — revenue, notes CRUD, retry, CSV
│   ├── visual.test.ts            # 30 visual snapshots
│   ├── visual-extended.test.ts   # 45 visual snapshots
│   ├── routing-new.test.ts       # 12 tests — /d/:token, lockedSize, email-capture API
│   └── prod-ui.test.ts           # 17 tests × 4 devices = 68 prod smoke tests
│
├── playwright.config.ts          # Local tests (uses mock API, preview server port 4173)
├── playwright.prod.config.ts     # Prod smoke tests (Desktop/Mobile Chrome, Pixel 7, iPad)
├── CLAUDE.md                     # Human-readable project instructions
├── AGENTS.md                     # This file — AI agent handover map
└── HANDOVER.md                   # Full human handover (architecture + credentials guide)
```

---

## 4. Database Schema (SQLite)

Key tables — see `server/db.js` for full schema + migration catch blocks:

```sql
designs          (token TEXT PK, state_json TEXT, render_path TEXT, created_at)
orders           (id, etsy_receipt_id UNIQUE, token TEXT NOT NULL, listing_type,
                  print_size, status, render_path, prodigi_order_id,
                  etsy_buyer_name, etsy_buyer_email, ship_address_json,
                  price_cents, revisions_used, tracking_number, tracking_url,
                  seller_notes, fulfilled_at, created_at)
templates        (id TEXT PK, name, description, settings_json, thumbnail_path,
                  design_group_id, fulfillment_provider, fulfillment_size,
                  sell_price_cents, is_active, etsy_listing_id, etsy_listing_url)
design_groups    (id TEXT PK, listing_id, name, description, base_settings_json)
listings         (id, slug UNIQUE, name, description, etsy_listing_id)
listing_templates(listing_id, template_id, position)  -- position controls card order
render_queue     (id, order_id, token, status, attempts, error, created_at, processed_at)
email_captures   (id, email, design_token, listing_slug, design_group_id, sent_at, ip_hash)
settings         (key TEXT PK, value TEXT)
assets           (id, type, name, filename, file_path, metadata JSON)
events           (id, type, session_id, template_id, listing_id, metadata JSON, created_at)
```

**Order status flow:**
```
pending → rendering → sent (digital) / rendered → fulfilled (print) / shipped
       → pending_manual (no design found — admin must handle)
       → failed (3 render attempts exhausted)
```

---

## 5. API Endpoints

### Public (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check `{ok:true,ts:N}` |
| POST | `/api/save-design` | Save design state, returns `{token}` |
| GET | `/api/design/:token` | Fetch design state JSON |
| POST | `/api/email-capture` | Capture email + send resume link |
| POST | `/api/verify-order` | Customer verifies Etsy order number |
| GET | `/api/download-file/:orderId?t=&exp=&sig=` | HMAC-signed download (7-day expiry) |
| GET | `/api/order-status?etsyOrderId=` | Poll render status |
| GET | `/api/templates/:listingId` | Templates for a listing (customer view) |
| GET | `/api/templates/:id/thumbnail` | Template thumbnail image |
| GET | `/api/listings/:slug` | Listing data with design groups |
| GET | `/api/assets/fonts` | Uploaded font list with roles |
| GET | `/api/assets/fonts.css` | Dynamic @font-face CSS |
| POST | `/api/events` | Client analytics events |
| GET | `/api/download/:token` | Legacy download (no HMAC) |

### Admin (requires `Authorization: Bearer <JWT>`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/login` | Get JWT (rate-limited: 5/15min) |
| GET/PATCH | `/api/admin/settings` | Site settings |
| GET | `/api/admin/orders` | Order list |
| GET | `/api/admin/orders/:id` | Order detail + event log |
| PATCH | `/api/admin/orders/:id/status` | Update status (validated enum) |
| PATCH | `/api/admin/orders/:id/notes` | Update seller notes |
| POST | `/api/admin/orders/:id/render` | Enqueue render job |
| POST | `/api/admin/orders/:id/fulfill` | Trigger Prodigi fulfillment |
| POST | `/api/admin/orders/:id/resend-email` | Resend poster-ready email |
| POST | `/api/admin/simulate-order` | Create test order (dev/testing) |
| GET/POST | `/api/admin/templates` | Template CRUD |
| PUT | `/api/admin/templates/:id` | Update template |
| POST | `/api/admin/templates/:id/settings` | Save design editor settings |
| POST | `/api/admin/templates/:id/sync-to-siblings` | Push to all size variants |
| POST | `/api/admin/templates/:id/deactivate` | Soft-delete |
| GET/POST | `/api/admin/templates/:id/fulfillment-options` | Fulfillment option CRUD |
| GET/POST/DELETE | `/api/admin/assets/upload` | Font/image asset management |
| POST | `/api/admin/design-groups` | Bulk-create listing + group + templates |
| DELETE | `/api/admin/design-groups/:id` | Delete group + all templates |
| GET | `/api/admin/analytics` | Analytics summary |
| GET | `/api/admin/render/queue` | Render queue status |
| POST | `/api/admin/render/:id/cancel` | Cancel queue item |
| POST | `/api/admin/render/:id/retrigger` | Retry failed render |

### Webhooks (no auth — signature verification via env secret)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/webhooks/prodigi` | Prodigi shipping events → update order + send email |
| POST | `/api/webhooks/email-inbound` | Resend inbound email → forward to owner Gmail |

---

## 6. Critical Invariants (Do Not Break)

1. **`rsync --delete --exclude='designs/'`** — The `/designs/` dir on the server contains
   thumbnails NOT in dist/. `--delete` without `--exclude` will wipe them on every deploy.

2. **PDF export removed from customer modal** — `DownloadButton.tsx` `!isTemplateMode` branch
   must never offer PDF. PDF preserves full vector quality = free substitute for paid product.

3. **`orders.token NOT NULL`** — The DB constraint requires a token. The Etsy poll generates
   a placeholder token even for `pending_manual` orders. Never set token to null before INSERT.

4. **`mapInteriorColor` syncs with `posterColor`** — `setPosterColor` in the store also updates
   `mapInteriorColor` when they were previously equal. Breaking this causes different colors in
   the circle vs. outer poster background.

5. **`listing_templates.position` controls card order** — All-zero positions fall back to
   `created_at` which won't match logical Design001→002→003 order. Always set explicit positions.

6. **Prodigi is the print fulfillment provider** — `server/services/prodigi.js` is wired into
   `renderQueue.js`. Printify stub (`printify.js`) is kept for reference only.

7. **Admin PDF export — never re-add** — Customer-facing download modal must only offer PNG.

8. **`posterType` toggle hidden when `designGroups.length > 0`** — Customer listing views must
   not show the Star/Street/Colored Map switcher. Controlled in `MainLayout.tsx`.

---

## 7. Key Data Flows

### New Customer Order (Etsy → Digital Download)
```
Etsy paid receipt detected (pollAndFulfill, every 2 min)
  → extractToken(receipt.personalization)
  → waterfall: direct token → email match → listing template default → placeholder
  → INSERT orders (status='pending' or 'pending_manual')
  → sendOrderReceivedEmail (resume design URL)
  → enqueueRender(orderId, token)
  → renderQueue worker picks up
  → renderLocal.js: Puppeteer opens /render?token= headlessly
  → PosterRenderPage: loads design, calls renderPosterToBlob()
  → window.__posterPng = base64 PNG
  → renderQueue receives file path
  → UPDATE orders status='sent', fulfilled_at
  → sendPosterReadyEmail with signed /api/download-file/:id link (7-day, 3 revisions)
```

### New Customer Order (Etsy → Print)
```
... same as above through render ...
  → renderQueue calls fulfillPrintOrder(order, renderFilePath)
  → prodigi.js: POST /orders with render PNG URL + ship address
  → UPDATE orders status='fulfilled', prodigi_order_id=...
  → Prodigi webhook POST /api/webhooks/prodigi when shipped
  → UPDATE orders status='shipped', tracking_number=...
  → sendPrintShippedEmail
```

### Design Save + Share
```
Customer clicks "Share Design Link"
  → POST /api/save-design {state: {...}}
  → Server: crypto.randomBytes(16).toString('base64url') → token
  → INSERT designs (token, state_json)
  → Response: {token}
  → Frontend copies window.location.origin + '/d/' + token to clipboard
  → Any device visiting /d/:token loads design state into store
```

### Verify Order (Revision flow)
```
Customer visits /verify, enters Etsy order number
  → POST /api/verify-order {etsyOrderId, token?}
  → If order.status='sent': return downloadUrl (signed HMAC link)
  → If customer provides new token (revised design): enqueue re-render
  → revisions_used incremented; max_revisions setting enforced
```

---

## 8. Render Pipeline

**Timing on t3.micro (1 GB RAM, 2 GB swap, Chromium ~280 MB RSS):**
| Size | Time | Output |
|------|------|--------|
| 8x10 | ~9s | ~1.6 MB PNG |
| 18x24 | ~11s | ~4.7 MB PNG |
| 24x36 | ~26s | ~6.9 MB PNG |

**Config flags (server/.env):**
```
ENABLE_LOCAL_RENDER=true      # Must be true for renders to work
RENDER_LAMBDA_URL=            # If set, delegates to Lambda instead
RENDER_MIN_FREE_MEM_MB=250    # Guardrail — defers if RAM < threshold
RENDER_MIN_FREE_DISK_MB=512   # Guardrail — defers if disk < threshold
FRONTEND_URL=https://themappedmoment.com  # Puppeteer navigates here
RENDERS_DIR=/home/ubuntu/poster-studio/server/data/renders
```

**Chromium binary:** `~/.cache/puppeteer/chrome/linux-146.0.7680.153/chrome-linux64/chrome`

**Browser singleton** — `renderLocal.js` keeps one browser instance alive across renders.
New page per render, closed after. Restart service to reset browser if it hangs.

---

## 9. Deployment

```bash
# Frontend
npm run build
rsync -avz --delete --exclude='designs/' dist/ ubuntu@3.107.34.169:/var/www/poster-studio/
# ↑ CRITICAL: --exclude='designs/' must stay. --delete wipes thumbnails otherwise.

# Server
rsync -avz --exclude node_modules --exclude data --exclude .env \
  server/ ubuntu@3.107.34.169:/home/ubuntu/poster-studio/server/
ssh ubuntu@3.107.34.169 "cd /home/ubuntu/poster-studio/server && \
  npm install --production && sudo systemctl restart poster-studio-api && \
  sleep 2 && sudo systemctl is-active poster-studio-api"
```

---

## 10. Test Commands

```bash
# Local tests (requires: npm run build first, then preview server auto-starts)
npm run build && npx playwright test

# Run specific file
npx playwright test tests/designer.test.ts

# Production smoke tests (4 devices × 17 scenarios = 68 tests)
npx playwright test --config=playwright.prod.config.ts --timeout=60000

# Simulate orders on production (test render + email flow)
ADMIN_PASSWORD=<pass> node server/scripts/simulate-orders.js --prod
```

---

## 11. Environment Variables (server/.env)

```bash
# ── Critical — must be set before going live ──
ADMIN_PASSWORD=             # bcrypt hash ($2b$12$...) or plaintext (hash it!)
JWT_SECRET=                 # Random 32+ char string for signing JWTs
DOWNLOAD_SECRET=            # Random 32+ char string for signing download URLs
APP_URL=https://themappedmoment.com
FRONTEND_URL=https://themappedmoment.com

# ── Render ──
ENABLE_LOCAL_RENDER=true
RENDERS_DIR=/home/ubuntu/poster-studio/server/data/renders

# ── Email ──
RESEND_API_KEY=             # re_xxxxx
EMAIL_FROM=studio@themappedmoment.com
EMAIL_REPLY_TO=studio@themappedmoment.com
EMAIL_FORWARD_TO=           # Owner email for inbound forwarding

# ── Etsy ──
ETSY_API_KEY=               # Etsy app API key
ETSY_API_SECRET=            # Etsy shared secret
ETSY_ACCESS_TOKEN=          # OAuth access token (auto-refreshes)
ETSY_REFRESH_TOKEN=         # OAuth refresh token
ETSY_SHOP_ID=12648302

# ── Print fulfillment ──
PRODIGI_API_KEY=            # Prodigi API key (blank = skip fulfillment)
PRODIGI_WEBHOOK_SECRET=     # For webhook signature verification

# ── Security ──
CORS_ORIGIN=https://themappedmoment.com  # Comma-separated if multiple
```

---

## 12. Known Gotchas for Agents

- **`applyTemplate.ts` appends `?ts=Date.now()`** to template fetch URLs. Playwright route
  matchers must use regex `/\/api\/templates\/name/` not glob `**/api/templates/name`.

- **`devices['iPhone 14']` includes `defaultBrowserType: webkit`** which Playwright forbids
  in describe groups. Use `playwright.prod.config.ts` project config instead.

- **MapLibre `networkidle` never settles** (tiles keep loading). Use `waitForSelector('svg')`
  or a fixed timeout instead of `waitForLoadState('networkidle')`.

- **`listing_templates` position=0 for all** → falls back to `created_at` order, which may not
  match intended Design001→002→003 sequence. Set explicit positions after bulk insert.

- **`coloredmap` mode calls `applyHeritagePOIFilter()`** after style loads in `StreetMapCapture`.
  This strips business POIs from the OpenFreeMap bright style.

- **Font embedding in renders**: `renderPoster.ts` embeds fonts as base64 data URIs. Fonts in
  `FONT_REGISTRY` (`src/utils/fontRegistry.ts`) → correct. System fonts or missing registry
  entries → renders as fallback serif. Verify by checking PNG file size (>300 KB = fonts embedded).

- **`mapInteriorColor` defaults to `#1B2735`**. If `posterColor` was changed without updating
  `mapInteriorColor`, the circle appears a different shade. Fixed: `setPosterColor` now syncs
  `mapInteriorColor` when they were previously equal.
