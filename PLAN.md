# The Mapped Moment — Master Plan

> Last updated: 2026-04-25
> Live site: https://themappedmoment.com
> Etsy shop: TheMappedMoment (Shop ID: 12648302)

---

## System Architecture (High Level)

```
ETSY SHOP (public storefront)
  └─ Listing (one Etsy product URL)
       └─ Design Group (one visual identity — Design001..006+)
            ├─ Has its own customer URL: /l/:slug/:designSlug
            └─ Template per size (8x10, 16x20, A1..A5, etc.)
                 ├─ Same-ratio sizes → IDENTICAL layout (auto-synced on save)
                 └─ Different-ratio sizes → Style synced, layout independent

CUSTOMER JOURNEY
  Etsy listing → /l/:slug/:designSlug (campaign-specific) → designer
  → Etsy checkout → poll picks up order → render queue → PNG @ 300 DPI
  → download link

ADMIN JOURNEY
  /admin/listings → design groups → /admin/design-editor/:id
  Save → auto-cascade same-ratio siblings
  "Sync to all sizes" → push style to all ratios
```

### What's Sound (don't change)
- Listing → Design Group → Template hierarchy in SQLite
- Zustand store + DESIGN_FIELDS + TEMPLATE_FIELDS pattern
- Aspect-ratio sync rules (A1-A5 identical, 8x10=16x20, etc.)
- Server-side render queue (Puppeteer, async with retry)
- Per-design URLs for A/B testing campaigns
- Mobile responsive layout (poster top, controls below)
- Rate limiting: public endpoints only (verify/download), not admin

### Known Architectural Debt (fix when it causes pain)
- `SidebarControls.tsx` is 2200+ lines — split into accordion panel components
- `VectorStarMap.tsx` has 1400+ lines — extract star/text/border as hooks
- `listing_templates` join table is redundant (design_groups already links templates)
- No CI/CD — manual rsync deploy; add GitHub Actions when team grows
- No DB backups — daily sqlite WAL backup to S3 (add before real orders flow)

---

## Current State (April 25, 2026)

### Working ✓
- Public designer — star map, street map, colored map
- **Mobile responsive layout** — poster preview top, accordion controls below, touch zoom, 44px tap targets
- Admin panel — listings, design editor, orders, queue, Etsy, assets
- 6 designs in production (Design001..006) — all 5+ sizes each, same-ratio auto-sync
- Etsy OAuth + polling (every 2 min), token auto-refresh
- Render queue (Puppeteer, PNG at 300 DPI, retry logic)
- Template sync — same-ratio auto-cascade, cross-ratio style push
- Order verification → download link flow (silent download, file-extension-masked)
- Email: daily seller digest, poster-ready notification
- Watermark on free exports
- **Per-design landing URLs** — `/l/:slug/:designSlug` for A/B testing campaigns
- PDF export (admin/template mode only — never customer view)
- Visual test suite (22/22 passing)

### NOT Working / Not Done ✗
- **0 Etsy listings published** — shop exists but no live products
- **No real orders processed** — end-to-end untested with real money
- **Printify not configured** — credentials empty, print fulfillment not wired
- **No DB backups** — single SQLite file, no redundancy
- **Server-side render not enabled in prod** — `ENABLE_LOCAL_RENDER` is unset; orders would fall through to `pending_manual`
- **3,600 lines uncommitted** — recent design fields, fonts, PDF, silent download all in working tree only

---

## Phase 0 — Lock In + First Revenue (this week)

**Goal:** Existing code is committed, production tested end-to-end, first paid order processed.

### 0a. Lock in the uncommitted work (today)
1. Review `git status` and the diffs in groups: design fields → docs → tests → deps
2. Commit in 3-4 logical commits (do NOT amend, prefer new commits)
3. Push to remote
4. Tag `v1.0-pre-launch` so we have a rollback point

### 0b. Set up DB backup (today, before any real orders)
```bash
# On VPS:
0 3 * * * sqlite3 /home/ubuntu/poster-studio/server/data/db.sqlite \
  ".backup '/home/ubuntu/backups/db-$(date +\\%Y\\%m\\%d).sqlite'"
# + 30-day retention cleanup
0 4 * * * find /home/ubuntu/backups -name 'db-*.sqlite' -mtime +30 -delete
```
A lost SQLite = lost all orders. Non-negotiable before going live.

### 0c. Enable server-side rendering on prod
1. Add 2GB swap on VPS (t3.micro has 1GB RAM, Puppeteer needs more)
2. Set `ENABLE_LOCAL_RENDER=true` and `FRONTEND_URL=https://themappedmoment.com` in `server/.env`
3. Restart `poster-studio-api`
4. Test: trigger a render via admin queue page, confirm PNG appears in `data/renders/`

### 0d. Publish Etsy listings (this week)
1. Pick the 3 strongest designs (Design002, Design004, Design005 are the most polished)
2. Write 3 Etsy listing titles + descriptions with long-tail keywords
3. Create listing images: 5 photos per listing (lifestyle mockup, designer screenshot, all 6 designs montage, sizing chart, "make it yours" personalization shot)
4. Publish via admin → Etsy → set `ETSY_DIGITAL_LISTING_IDS` in server `.env`
5. Price: $14.99–$17.99 digital (89% margin, no COGS)

**Start with 3 listings, not 10.** Speed > breadth.

### 0e. End-to-end test before marketing
1. Buy own listing via Etsy test purchase (use coupon code)
2. Confirm pipeline: Etsy poll picks up → token extracted → render queued → PNG generated → email sent → download works → file extension masked
3. Fix any real-world breakage
4. Only market after this passes

---

## Phase 1 — A/B Testing & Listing Optimization (Weeks 1–4)

This is where the new per-design URLs become the core strategy.

### 1a. Run design-as-thumbnail A/B tests
**Hypothesis:** Different first-impression designs convert different audiences. Currently every Etsy listing pushes Design001 by default.

**Test setup:**
- Same Etsy listing, but rotate the listing's main thumbnail every 7 days across Design001/002/004/005/006
- For each rotation, set the Etsy listing's URL to `themappedmoment.com/l/star-map-night-we-met/design00X` so the customer lands on the matching design
- Measure: click-through rate (CTR) from Etsy → listing page (Etsy stats), then conversion to checkout (our `design_view` → Etsy purchase rate)

**Tooling needed (build this week):**
- `/admin/analytics` page already has event log. Add a per-design conversion query: count `design_view` events grouped by `designGroupId`, joined to orders by referrer or session
- Simple spreadsheet export: "design view → order" rates per `designSlug`

### 1b. Headline & price A/B
- Listing 1: $14.99, "Custom Star Map Print — The Night We Met"
- Listing 2 (duplicate): $19.99, "Custom Star Map — Anniversary Gift, Wedding Date, Newborn Star Map"
- Run for 2 weeks. Cheaper isn't always better — premium framing wins on average order value.

### 1c. Listing image A/B (quick wins)
For each Etsy listing, test ONE variable:
- Lifestyle frame mockup vs clean product shot vs animated GIF (poster zoom)
- Carousel order: photo 1 = mockup vs photo 1 = product-only

Etsy weights early views heavily — first 14 days determines long-term ranking.

### 1d. Verify/Download page polish (do once Phase 0 ships)
- Current page works but is plain. Add: step indicator (1.Submit → 2.Processing → 3.Ready), brand logo, success state with download CTA + "print at Walmart/CVS" guide for digital buyers
- Reduces refund risk by setting print expectations
- Show remaining revisions count

---

## Phase 2 — Print Fulfillment (Weeks 4–8)

### 2a. Connect Prodigi (international, replaces Printify)
Per existing memory: use **Prodigi** for prints, not Printify.

| Destination | Provider | COGS | Sell | Margin |
|-------------|----------|------|------|--------|
| US digital | — | $0 | $14.99 | 89% |
| US 18x24 print | Prodigi | ~$10 | $39.99 | 64% |
| US 24x36 print | Prodigi | ~$11 | $44.99 | 65% |
| EU/UK/AU digital | — | $0 | $14.99 | 89% |
| EU/UK/AU 18x24 print | Prodigi (local) | ~$12 | $44.99 | 65% |

Steps:
1. Get Prodigi API key (sandbox first), configure in `server/.env`
2. Replace `server/services/printify.js` with `server/services/prodigi.js` (different API surface)
3. Add Etsy physical listing variants (size as Etsy variation)
4. Test in sandbox: render → upload → order → track → delivered
5. Order ONE physical sample for QA before going live

### 2b. Framed prints (Phase 2b)
Highest AOV. PrintOps cheapest at $42 COGS for 18x24 framed → sell $89–$99.
Hold until digital + unframed prints are running smoothly.

---

## Phase 3 — Growth & Catalog Expansion (Months 2–3)

### 3a. More designs (low-effort, high-leverage)
The per-design URL system makes new designs trivially testable. Add 4-6 more design groups:
- Wedding-specific (heart shape default, names prominent)
- Anniversary (with year prominently displayed)
- Baby birth (gentle pastels, time-of-birth emphasis)
- Memorial (subdued palette, In Memory of header)
- Pet memorial (paw prints, no human-centric copy)
- Travel commemoration (city + coordinates emphasis)

Each new design = one `/l/:slug/:designSlug` URL = one Etsy listing variation.

### 3b. New listing types (separate slugs)
- `/l/street-map-anniversary` — street map flagship
- `/l/colored-map-travel` — colored map flagship
- `/l/his-and-hers-stars` — paired set listings (new SKU concept, 2 posters bundled)

### 3c. Seasonal pushes (calendar-driven)
- Valentine's Day: 2 weeks of Etsy Ads at $5/day on the Anniversary design
- Mother's Day: highlight the Family/Birth designs
- June (wedding season): heavy promotion of wedding-specific designs
- Christmas: gift-card UX flow (deliver instantly via email)

### 3d. Etsy SEO hygiene
- 13 long-tail tags per listing ("first dance song star map", "wedding anniversary gift wife custom poster")
- Listing renewal monthly (Etsy weights freshness)
- Reply to messages within 4 hours (Etsy's algorithm rewards this)

---

## Phase 4 — Hardening (Ongoing, do as needed)

### 4a. Performance
- Code-split admin routes (lazy-load — MapLibre alone is 450KB, currently loads even on starmap-only sessions)
- `React.memo` on VectorStarMap to prevent unnecessary re-renders
- `useShallow` Zustand selectors elsewhere in SidebarControls (subscribes to too many fields right now — VectorStarMap already migrated)
- Target: initial JS < 600KB (currently 1.9MB)

### 4b. Component refactor
- Split `SidebarControls.tsx` (2200 lines) into: LocationPanel, TypographyPanel, StylePanel, ShapePanel, VisibilityPanel, TemplatesPanel
- Extract inline edit + drag behavior from `VectorStarMap.tsx` into custom hooks
- Adding new text elements: follow New Text Element Checklist in CLAUDE.md

### 4c. Reliability
- Dead letter queue for renders that fail 3+ times (alert admin via Etsy message or email)
- Webhook signature verification for Etsy callbacks
- Uptime monitor: simple healthcheck ping (UptimeRobot free tier)
- GitHub Actions CI: build + type-check on every push (no deploy automation yet)

### 4d. Multi-admin / team (future, only if hiring)
- Currently single-admin JWT. Add role-based access (admin, viewer, fulfillment-only)
- Audit log for template edits (who changed what, when)

---

## Key Rules (enforce always)

### Template / Size Rules
- Same aspect ratio → IDENTICAL layout (auto-cascades on every save — no manual step)
- Different aspect ratio → style only (fonts, colors, kerning, toggles); layout independent
- `printSize` in settings_json MUST always equal `fulfillment_size` column — server pins this on every save

### URL Rules
- Customer-facing canonical URL is `/l/:slug` (Design001 default) or `/l/:slug/:designSlug` (specific design)
- Admin URLs are under `/admin/*`
- Designer-direct URL is `/t/:templateId` (no listing context)
- Never strip the `:designSlug` from canonical URLs in any redirect — A/B campaigns depend on it

### Adding a New Design
1. Create design group in admin → auto-generates all size templates
2. Edit A4 (or 18x24 baseline) → save cascades to all same-ratio sizes
3. Open a different-ratio size (5x7, 11x14) → adjust layout offsets → save
4. Click "Sync to all sizes" once when style is finalised → pushes style to all ratios
5. Capture thumbnails locally and on prod
6. Run `sync-listing-state.cjs` on local + prod
7. Set `listing_templates.position` to control sidebar order
8. Verify with `verify-listing.cjs` (visual diff local vs prod)
9. Never manually edit DB for layout values — always go through the editor

### Adding a New Text Element
Follow the New Text Element Checklist in CLAUDE.md (5 steps across 5 files). Do not skip any step.

---

## Key Metrics

| Metric | Now (Apr 25) | Target Month 1 | Target Month 3 |
|--------|--------------|----------------|----------------|
| Active Etsy listings | 0 | 5–10 | 20+ |
| Daily Etsy views | 0 | 50+ | 500+ |
| Conversion rate (view → order) | — | 1–2% | 3–5% |
| Monthly revenue | $0 | $300+ | $1,500+ |
| Avg order value | — | $15 | $28 |
| Failed renders | — | <5% | <1% |
| **Best/worst design conversion delta** | — | identify | exploit |

That last metric is the new KPI from Phase 1 — once we know which design converts best, we make it the default thumbnail and channel ad spend toward it.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| SQLite data loss | Critical | **Daily backup cron — Phase 0b (do this week)** |
| Etsy account suspension | Critical | Follow TOS, no keyword stuffing, 4h reply SLA |
| Render failures at scale | High | Dead letter queue + admin alerts (Phase 4c) |
| Print quality on delivery | High | Order physical sample before listing prints |
| Token refresh failure | Medium | Auto-refresh on 401, alert on repeated failure |
| printSize corruption | Medium | Server pins printSize = fulfillment_size on every save |
| MapLibre tile CDN down | Low | Service worker tile cache is the fallback |
| Unauthorized free renders | Low | Silent download masks file extension; watermark on free PNG |

---

## Related Files
- `SESSION_HANDOVER.md` — current state for next agent (read before this file)
- `CLAUDE.md` — dev rules, new text element checklist, listing URL patterns, design workflow
- `HANDOVER.md` — full handover: schema, deployment, credentials, gotchas
- `memory/printing_costs_research.md` — print provider cost comparison
- `memory/framing_canvas_costs.md` — framed poster & canvas provider comparison
- `memory/feedback_focus_priorities.md` — Prodigi (not Printify), focus on template system
