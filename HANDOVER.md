# HANDOVER — The Mapped Moment (Poster Studio)

> For AI coding agents (Claude Code, Cursor, Copilot Workspace, Devin, etc.)
> Last updated: 2026-04-01

This document gives you everything you need to understand, modify, and deploy this project. Read CLAUDE.md first for quick-reference, then this file for deeper context.

---

## 1. What This Project Is

**The Mapped Moment** is a custom poster design tool + Etsy storefront for selling personalized star maps, street maps, and colored maps as digital downloads and physical prints.

**Business model:**
- Customer finds listing on Etsy → buys digital download ($12-20) or physical print ($25-45)
- Customer visits themappedmoment.com/verify → enters Etsy order number
- System verifies purchase via Etsy API → renders poster → delivers download link or sends to print fulfillment
- For digital: customer gets 300 DPI PNG download (link valid 7 days, 3 free revisions)
- For prints: system uploads to Printify/Scalable Press → ships to customer

**Revenue so far:** $0 — shop is connected but no listings published yet. This is the immediate priority.

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
│    /verify        → Order verification + download        │
│    /gallery       → Template gallery (public)            │
│                                                          │
│  Admin Routes (/admin/*):                                │
│    /admin/login      → JWT auth                          │
│    /admin/dashboard  → Overview stats                    │
│    /admin/orders     → Order management                  │
│    /admin/queue      → Render queue status                │
│    /admin/templates  → Template CRUD + editor             │
│    /admin/listings   → Collection management              │
│    /admin/etsy       → Etsy shop sync + listing perf     │
│    /admin/analytics  → Event log                         │
│    /admin/assets     → Image uploads                     │
│    /admin/settings   → Config (admin password, etc)      │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    BACKEND (Express 5 + SQLite)           │
│                                                          │
│  server/index.js          → Main entry, route mounting   │
│  server/db.js             → Schema, migrations, seeds    │
│  server/middleware/auth.js → JWT auth middleware          │
│                                                          │
│  Routes:                                                 │
│    /api/designs           → Save/load poster designs     │
│    /api/verify-order      → Etsy order verification      │
│    /api/download-file/:id → Signed file download         │
│    /api/templates         → Template CRUD                │
│    /api/listings          → Public listing collections   │
│    /api/admin-orders      → Order management (authed)    │
│    /api/admin-settings    → Settings CRUD (authed)       │
│    /api/admin-assets      → File upload (authed)         │
│    /api/admin-etsy        → Etsy API proxy (authed)      │
│    /api/webhooks          → Printify/Etsy webhooks       │
│    /api/analytics         → Event ingestion              │
│    /auth/etsy             → OAuth 2.0 PKCE flow          │
│                                                          │
│  Services:                                               │
│    server/services/etsy.js      → Etsy API client        │
│    server/services/render.js    → Puppeteer renderer     │
│    server/services/renderQueue.js → Async job queue      │
│    server/services/printify.js  → Print fulfillment      │
│    server/services/email.js     → Nodemailer (digest)    │
│                                                          │
│  Background Jobs:                                        │
│    - Render queue worker (continuous)                     │
│    - Etsy order polling (every 2 min)                    │
│    - Daily seller digest email (8 AM cron)               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE                        │
│                                                          │
│  AWS EC2 t3.micro (ap-southeast-2, Sydney)               │
│  Ubuntu 24.04 · IP: 13.210.227.152                       │
│  Domain: themappedmoment.com (Let's Encrypt SSL)         │
│  Nginx: reverse proxy port 3001 → Express                │
│  Systemd: poster-studio-api.service                      │
│  SQLite DB: /home/ubuntu/poster-studio/server/data/      │
│  Renders:   /home/ubuntu/poster-studio/server/data/renders/ │
│  Frontend:  /var/www/poster-studio/ (static, nginx)      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Key Technical Decisions & Gotchas

### Etsy API v3 — Header Format (CRITICAL)
The `x-api-key` header MUST be `keystring:shared_secret` (colon-separated). The OAuth `client_id` uses keystring only. This is non-obvious and caused hours of debugging. See `etsyHeaders()` in both `server/services/etsy.js` and `server/routes/verify.js`.

### Etsy OAuth Scopes
Only `transactions_r shops_r email_r` are valid for our use case. `conversations_w` does NOT exist in Etsy API v3 (will cause `invalid_scope` error).

### Three Map Modes
The `posterType` field controls which mode is active:
- `starmap` — SVG star chart, no map background image
- `streetmap` — 2-color monochrome street map, `mapStyleUrl = null`
- `coloredmap` — Full-color OpenFreeMap bright style, `mapStyleUrl` is set automatically

All three share the same SVG poster template in `VectorStarMap.tsx`. Street/colored maps render offscreen via `StreetMapCapture.tsx` → capture as data URL → inject as `<image>` in SVG.

### Render Pipeline
1. Customer buys on Etsy → Etsy poll detects paid receipt
2. Design token extracted from order personalization note
3. Render job enqueued in `render_queue` table
4. Worker spawns Puppeteer → loads designer at `/t/{templateId}?token={token}` → screenshots SVG at 300 DPI
5. PNG saved to `server/data/renders/`
6. For digital: download link generated (HMAC-signed, 7-day expiry)
7. For print: PNG uploaded to Printify → order created → sent to production

### State Management
`useStore.ts` is a massive Zustand store with 100+ fields. `DESIGN_FIELDS` array lists all fields that define a poster design (vs UI-only fields like `previewZoom`). Templates save/restore only `DESIGN_FIELDS`.

### Font System
Fonts are bundled via Fontsource packages (not Google Fonts CDN). Custom font `Mapped2` is in `src/assets/fonts/`. Font CSS is loaded in `src/assets/fonts/fonts.css`. Available fonts are listed in `TITLE_FONTS`, `SUBTITLE_FONTS`, `DETAILS_FONTS` arrays in `SidebarControls.tsx`.

---

## 4. Database Schema (SQLite)

```sql
-- Core tables (see server/db.js for full DDL)

designs       (token TEXT PK, state_json TEXT, render_path TEXT, created_at INTEGER)
orders        (id INTEGER PK, etsy_receipt_id TEXT, token TEXT, listing_type TEXT,
               print_size TEXT, status TEXT DEFAULT 'pending', render_path TEXT,
               printify_order_id TEXT, etsy_buyer_name TEXT, etsy_buyer_email TEXT,
               ship_address_json TEXT, revisions_used INTEGER DEFAULT 0,
               notes TEXT, fulfilled_at INTEGER, created_at INTEGER)
templates     (id INTEGER PK, name TEXT, settings_json TEXT, thumbnail_url TEXT,
               etsy_listing_id TEXT, etsy_listing_data TEXT, is_active BOOLEAN DEFAULT 1,
               created_at INTEGER, updated_at INTEGER)
render_queue  (id INTEGER PK, order_id INTEGER, token TEXT, status TEXT DEFAULT 'pending',
               attempts INTEGER DEFAULT 0, error TEXT, created_at INTEGER, updated_at INTEGER)
settings      (key TEXT PK, value TEXT)
assets        (id INTEGER PK, type TEXT, filename TEXT, file_path TEXT, metadata TEXT,
               created_at INTEGER)
listings      (id INTEGER PK, slug TEXT UNIQUE, name TEXT, description TEXT,
               is_active BOOLEAN DEFAULT 1, created_at INTEGER, updated_at INTEGER)
listing_templates (listing_id INTEGER, template_id INTEGER, sort_order INTEGER,
                   PRIMARY KEY(listing_id, template_id))
events        (id INTEGER PK, name TEXT, props TEXT, session_id TEXT, created_at INTEGER)
order_events  (id INTEGER PK, order_id INTEGER, type TEXT, label TEXT, detail TEXT,
               actor TEXT DEFAULT 'system', created_at INTEGER)
```

**Order statuses:** `pending` → `rendering` → `sent` (digital) or `fulfilled` (print). Also: `pending_manual`, `failed`.

---

## 5. Environment Variables

All in `server/.env` (see `.env.example` for template):

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Express port (3001) |
| `APP_URL` | Yes | `https://themappedmoment.com` |
| `DOWNLOAD_SECRET` | Yes | HMAC secret for signed download URLs |
| `DB_PATH` | Yes | Path to SQLite file |
| `RENDERS_DIR` | Yes | Path for rendered PNGs |
| `CORS_ORIGIN` | Yes | Allowed CORS origin |
| `ETSY_API_KEY` | Yes | Etsy keystring (for OAuth client_id) |
| `ETSY_API_SECRET` | Yes | Etsy shared secret |
| `ETSY_ACCESS_TOKEN` | Auto | Set by OAuth flow, auto-refreshes |
| `ETSY_REFRESH_TOKEN` | Auto | Set by OAuth flow |
| `ETSY_SHOP_ID` | Auto | Set by OAuth flow (12648302) |
| `ETSY_REDIRECT_URI` | Yes | OAuth callback URL |
| `ETSY_DIGITAL_LISTING_IDS` | Later | Comma-separated Etsy listing IDs for digital products |
| `ETSY_PRINT_LISTING_IDS` | Later | Comma-separated Etsy listing IDs for physical prints |
| `PRINTIFY_API_TOKEN` | Later | Printify API key |
| `PRINTIFY_SHOP_ID` | Later | Printify shop ID |
| `RENDER_LAMBDA_URL` | Optional | AWS Lambda for offloading renders |
| `ADMIN_PASSWORD_HASH` | Yes | bcrypt hash of admin password |
| `JWT_SECRET` | Yes | Secret for admin JWT tokens |

---

## 6. Development

```bash
cd /home/dev/poster-studio

# Frontend dev server (hot reload)
npm run dev          # → http://localhost:5173

# Backend server (run separately in another terminal)
cd server && node index.js   # → http://localhost:3001

# Build frontend for production
npm run build        # → dist/

# Run tests
npm run build && npx playwright test

# Deploy frontend to VPS
rsync -avz --delete dist/ ubuntu@13.210.227.152:/var/www/poster-studio/

# Deploy server to VPS
rsync -avz --exclude node_modules --exclude data --exclude .env \
  server/ ubuntu@13.210.227.152:/home/ubuntu/poster-studio/server/
ssh ubuntu@13.210.227.152 "cd /home/ubuntu/poster-studio/server && npm install --production && sudo systemctl restart poster-studio-api"

# Quick frontend redeploy
npm run build && rsync -avz --delete dist/ ubuntu@13.210.227.152:/var/www/poster-studio/
```

---

## 7. Server Management (VPS)

```bash
# SSH into VPS
ssh ubuntu@13.210.227.152

# Service management
sudo systemctl status poster-studio-api
sudo systemctl restart poster-studio-api
sudo journalctl -u poster-studio-api -f   # live logs

# Database
sqlite3 /home/ubuntu/poster-studio/server/data/db.sqlite

# Nginx
sudo nginx -t && sudo systemctl reload nginx
# Config: /etc/nginx/sites-enabled/poster-studio

# SSL cert (auto-renews, but to force)
sudo certbot renew
```

---

## 8. File-by-File Guide

### Frontend — Core Components

| File | Lines | Purpose | Complexity |
|------|-------|---------|------------|
| `src/components/VectorStarMap.tsx` | ~1200 | Main SVG poster renderer. 3 big useEffects: background layer, star/map layer, text layer. Also handles inline text editing and drag-to-reposition. | Very High |
| `src/components/SidebarControls.tsx` | ~2166 | All sidebar controls in accordion sections. Font pickers, color pickers, text inputs, sliders, template buttons, design presets. | Very High (needs decomposition) |
| `src/components/StreetMapCapture.tsx` | ~600 | Offscreen MapLibre GL renderer. Creates custom 2-color or bright style, captures canvas on idle, returns data URL. Handles tile prefetch and service worker cache. | High |
| `src/components/MainLayout.tsx` | ~400 | Split-pane layout. Left=sidebar, right=poster preview with zoom/pan. Orchestrates StreetMapCapture ↔ VectorStarMap data flow. | Medium |
| `src/components/CitySearch.tsx` | ~150 | Nominatim autocomplete for city/location search. | Low |
| `src/components/GlyphPicker.tsx` | ~200 | Visual browser for Mapped2 font glyphs (hearts, stars, decorative chars). | Low |
| `src/components/DownloadButton.tsx` | ~100 | SVG → Canvas → PNG export at 300 DPI. | Low |
| `src/components/VerifyOrder.tsx` | ~250 | Public order verification page with polling. | Medium |
| `src/components/ErrorBoundary.tsx` | ~50 | React error boundary wrapper. | Low |
| `src/components/TemplateSelector.tsx` | varies | Template picker UI. | Low |
| `src/components/GalleryPage.tsx` | varies | Public template gallery. | Low |
| `src/components/ListingPage.tsx` | varies | Public listing collection page. | Low |
| `src/components/PosterRenderPage.tsx` | varies | Server-side render target page. | Medium |
| `src/components/WelcomeModal.tsx` | varies | First-visit welcome/onboarding modal. | Low |

### Frontend — State & Utilities

| File | Purpose |
|------|---------|
| `src/store/useStore.ts` | Zustand store with 100+ fields. All poster state + setters. Template save/restore. Undo/redo history. |
| `src/utils/astronomy.ts` | D3 projection rotation from lat/lng/date/time for star map rendering. |
| `src/utils/geocode.ts` | Nominatim API wrapper for city search. |
| `src/utils/applyTemplate.ts` | Apply template settings_json to store state. |
| `src/utils/analytics.ts` | Event tracking (POST to /api/analytics). |

### Frontend — Admin Pages

| File | Purpose |
|------|---------|
| `src/admin/AdminLayout.tsx` | Admin shell: sidebar nav, auth guard, route outlet |
| `src/admin/DashboardPage.tsx` | Overview: order count, revenue, recent orders |
| `src/admin/OrdersPage.tsx` | Order list with filters, bulk actions, CSV export |
| `src/admin/OrderDetailPage.tsx` | Single order detail, status updates, notes, timeline |
| `src/admin/QueuePage.tsx` | Render queue status and retry controls |
| `src/admin/TemplatesPage.tsx` | Template list + CRUD |
| `src/admin/ListingsPage.tsx` | Listing collection management |
| `src/admin/EtsyPage.tsx` | Etsy shop connection, listing sync, performance table |
| `src/admin/AnalyticsPage.tsx` | Event log viewer |
| `src/admin/AssetsPage.tsx` | Image upload and management |
| `src/admin/SettingsPage.tsx` | Admin settings, password change, credentials |
| `src/admin/adminApi.ts` | Shared fetch wrapper with JWT auth for all admin API calls |

### Backend — Routes

| File | Auth | Key Endpoints |
|------|------|---------------|
| `server/routes/designs.js` | No | `POST /api/designs` (save), `GET /api/designs/:token` (load) |
| `server/routes/verify.js` | No | `POST /api/verify-order`, `GET /api/download-file/:id`, `GET /api/order-status` |
| `server/routes/templates.js` | Mixed | `GET /api/templates` (public), CRUD (authed) |
| `server/routes/listings.js` | Mixed | `GET /api/listings/:slug` (public), CRUD (authed) |
| `server/routes/admin-orders.js` | Yes | Order list, detail, status update, bulk actions, CSV export, notes |
| `server/routes/admin-etsy.js` | Yes | Proxy to Etsy API, listing sync, order import trigger |
| `server/routes/admin-settings.js` | Yes | Settings CRUD, credential management |
| `server/routes/admin-assets.js` | Yes | File upload/delete for listing images |
| `server/routes/auth.js` | No | `GET /auth/etsy` (start OAuth), `GET /auth/etsy/callback` |
| `server/routes/webhooks.js` | Varies | Printify order status webhooks |
| `server/routes/analytics.js` | No | `POST /api/analytics` (event ingestion) |

### Backend — Services

| File | Purpose |
|------|---------|
| `server/services/etsy.js` | `etsyFetch()` with auto token refresh, `fetchNewOrders()`, `pollAndFulfill()`, `sendDownloadLink()` |
| `server/services/render.js` | Puppeteer-based server-side poster rendering |
| `server/services/renderQueue.js` | Async render job queue with worker, retry logic |
| `server/services/printify.js` | `uploadImage()`, `createOrder()`, `sendToProduction()` |
| `server/services/email.js` | `sendPosterReadyEmail()`, `sendDailyDigest()` via Nodemailer |

---

## 9. Known Bugs (from plan file)

These bugs are documented in detail in `.claude/plans/nested-crunching-wreath.md`:

1. **Title jumps on drag start** — `naturalY` closure captures accumulated value instead of title's own offset. Fix: capture `const titleNaturalY = naturalY` before the drag block.

2. **Text jumps on inline edit** — Text useEffect re-runs and destroys/recreates SVG elements while editing. Fix: add `if (inlineEdit !== null) return;` guard at top of text effect.

3. **Street map jumps after drag** — `setIsDraggingMapImage(false)` called before coordinate setters, allowing stale captures through. Fix: reorder so coords are set before clearing the flag. Also: extend subscribe watcher to include `mapStyleUrl`, `posterType`, `mapBgColor`, `mapStreetColor`, `mapColorPreset`.

4. **Details font resize ignores zoom** — `event.dy` not divided by `previewZoom`. Fix: `dAccDy += event.dy / useStore.getState().previewZoom`.

---

## 10. Testing

Tests use Playwright with mock API fixtures:

```bash
npm run build && npx playwright test           # all tests
npx playwright test tests/poster-modes.test.ts # specific file
npx playwright test --headed                   # visible browser
npx playwright test --grep "revenue"           # by title
```

All tests use `setupMockApi(page)` from `tests/fixtures/mockApi.ts` which intercepts `/api/**` routes with canned responses.

**Test files:**

| File | Count | What It Tests |
|------|-------|---------------|
| `tests/admin.test.ts` | ~55 | Admin auth, dashboard, orders, templates, Etsy, settings, assets |
| `tests/designer.test.ts` | ~20 | Designer page load, template URLs, SVG structure, inline editing, share |
| `tests/features.test.ts` | ~30 | Revenue panel, retry, bulk actions, notes, CSV, fonts, share, verify |
| `tests/visual.test.ts` | ~30 | Visual snapshots of all major pages |
| `tests/poster-modes.test.ts` | ~50 | Star/Street/Colored map modes, shapes, search, date/time, zoom, colors |
| `tests/designer-controls.test.ts` | ~60 | All sidebar accordion sections, template buttons, fonts, text, colors |
| `tests/user-journeys.test.ts` | ~40 | E2E: customer flow, templates, share, verify, admin, bulk, CSV |
| `tests/error-states.test.ts` | ~35 | Invalid params, 404, Nominatim failures, auth errors, network failures |
| `tests/visual-extended.test.ts` | ~45 | Extended visual snapshots |
| `tests/admin-advanced.test.ts` | ~45 | Revenue, badges, notes CRUD, retry, bulk, CSV, fonts |

**Important:** MapLibre tests need `test.setTimeout(30000)`. Never use `waitForLoadState('networkidle')` with MapLibre — tiles never fully settle.

---

## 11. Immediate Next Steps (for whoever picks this up)

See `PLAN.md` for the full roadmap. The critical path is:

1. **Publish first Etsy listings** — Create templates in admin, generate listing images, publish via admin Etsy page
2. **A/B test listing content** — Duplicate listings with different images/titles, track views/favorites
3. **Verify end-to-end order flow** — Place test order, confirm render → download works
4. **Add watermark to free exports** — Prevent free downloads from cannibalizing sales
5. **Mobile responsive layout** — 60%+ of Etsy traffic is mobile

---

## 12. Credentials & Secrets

**DO NOT commit secrets to git.** All secrets live in `server/.env` on the VPS.

- Etsy API credentials are documented in the Claude Code memory system (not in this file)
- Etsy shop: TheMappedMoment, Shop ID: 12648302
- Admin password hash is in the server .env
- JWT secret is in the server .env
- Download HMAC secret is in the server .env

To re-authenticate Etsy: visit `https://themappedmoment.com/auth/etsy` in a browser while logged into the TheMappedMoment Etsy account.

---

## 13. Deployment Checklist

Before deploying changes:

- [ ] `npm run build` succeeds locally
- [ ] `npx playwright test` passes (or at least no regressions in changed areas)
- [ ] No secrets in committed code
- [ ] Frontend: `rsync -avz --delete dist/ ubuntu@13.210.227.152:/var/www/poster-studio/`
- [ ] Server: rsync server/, ssh in, `npm install --production`, restart systemd service
- [ ] Verify site loads at https://themappedmoment.com
- [ ] Check admin panel at /admin (if admin changes)
- [ ] Check server logs: `sudo journalctl -u poster-studio-api -f`

---

## 14. Print Fulfillment Cost Reference

For detailed per-size pricing, see the Claude Code memory file `memory/printing_costs_research.md`. Summary:

**Cheapest single-unit options:**
- **US small (≤18x24):** ShortRunPosters ($2-5 print, no API)
- **US large (24x36):** Scalable Press ($7.20 print, has API)
- **International:** Prodigi Budget or Gelato (local printing in 32+ countries)

**Etsy target pricing:**
- Digital download: $12.99-19.99 (89% margin)
- Physical 18x24: $39.99 (64% margin)
- Physical 24x36: $44.99 (65% margin)

---

## 15. A/B Testing Strategy

**Goal:** Find the listing content (images, videos, titles, tags) that converts best on Etsy.

**Method:**
1. For each template concept, create 2-3 Etsy listings with ONE variable changed
2. Track views, favorites, conversion rate via admin Etsy page (performance table)
3. After 2-4 weeks, deactivate underperformers
4. Clone winners and test the next variable

**Variables to test (priority order):**
1. Listing images — lifestyle mockup vs clean product shot vs video thumbnail
2. Titles — gift-focused vs product-focused vs occasion-focused
3. Price points — test $2-3 increments
4. Tags — different long-tail keyword combinations

**Rules:**
- One variable per test pair
- Minimum 2 weeks per test (Etsy algorithm needs indexing time)
- Keep 3+ control listings unchanged as baseline
- Don't change prices mid-test
