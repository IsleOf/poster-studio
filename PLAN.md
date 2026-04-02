# The Mapped Moment — Master Plan

> Last updated: 2026-04-01
> Live site: https://themappedmoment.com
> Etsy shop: TheMappedMoment (Shop ID: 12648302)

---

## Current State

### What's Live & Working
- **Public designer** at themappedmoment.com — star map, street map, colored map modes
- **Admin panel** at /admin — dashboard, orders, templates, listings, Etsy sync, queue, analytics, assets, settings
- **Etsy API connected** — OAuth PKCE flow, order polling every 2 min, token auto-refresh
- **Server-side render queue** — Puppeteer-based, async with retry
- **Order verification flow** — customer enters Etsy order # → gets download link
- **Email notifications** — daily seller digest, poster-ready email
- **Printify integration** — upload → create order → send to production (not yet configured with real credentials)
- **Template system** — create/edit templates, link to Etsy listings, public URLs (/t/{id})
- **Listing collections** — group templates into public collections (/l/{slug})

### What's NOT Live Yet
- **0 active Etsy listings** — shop exists but no products published
- **No real orders processed** — pipeline is built but untested end-to-end with real money
- **Printify not configured** — API token, shop ID, blueprint/variant IDs all empty
- **No mobile layout** — desktop-only sidebar, unusable on phones
- **No watermark on free exports** — anyone can download full-res for free

---

## Phase 0 — Launch First Listings (THIS WEEK)

**Goal:** Get revenue flowing. Everything else is secondary.

### 0a. Create & Publish Digital Download Listings
1. Create 3-5 template presets in admin (star map dark, star map light, colored map, street map, heart shape)
2. For each template, manually create compelling listing images + a video showing the designer
3. Publish to Etsy via admin panel "Publish to Etsy" flow
4. Set `ETSY_DIGITAL_LISTING_IDS` in server .env with the new listing IDs
5. Price: $12.99-$19.99 for digital downloads (pure margin)

### 0b. A/B Test Listing Content
**Strategy:** Duplicate listings with different images/videos/titles to find what converts.

For each template concept, create 2-3 listing variants:
- **Variant A:** Lifestyle mockup images (poster in frame on wall)
- **Variant B:** Clean flat-lay / close-up detail shots
- **Variant C:** Video walkthrough of the designer customization process

Track per-listing:
- Views, favorites, conversion rate (Etsy provides these)
- Use admin Etsy page to monitor listing performance (views, favorites columns already built)
- After 2-4 weeks, deactivate underperformers, double down on winners
- Gradually increase price on high-performers to find ceiling

**Naming convention:** Use descriptive titles that differ per variant:
- "Custom Star Map Print - Night Sky Poster - Personalized Gift"
- "Star Map of Our First Date - Custom Night Sky - Anniversary Gift"
- "Where We Met Star Map - Personalized Constellation Poster"

### 0c. Verify End-to-End Flow
1. Place a test order on Etsy (buy own listing with a coupon)
2. Confirm: Etsy poll picks it up → design token extracted → render queued → PNG generated → download link works
3. Fix any issues in the real flow

---

## Phase 1 — Protect Revenue & Reduce Friction (Weeks 2-4)

### 1a. Watermark on Free Exports — ALREADY DONE
- Diagonal "DEMO" watermark already baked into free PNG exports (`drawDemoWatermark` in `src/utils/renderPoster.ts`)
- Server-side renders for paid orders pass `watermark: false`
- DownloadButton shows "This is a watermarked preview" disclosure with Etsy link
- WelcomeModal explains the watermark model to new visitors

### 1b. Mobile-Responsive Layout
- Stacked layout on mobile: poster preview top (~40vh), controls scroll below
- Touch-friendly controls (44px min targets, pinch-to-zoom preview)
- Desktop layout unchanged
- **Why first:** Etsy traffic is 60%+ mobile. If they can't use the designer, they can't buy.

### 1c. Polish the Verify/Download Page
- Better UX: progress steps, clear messaging, branded design
- "Print at Walmart Photo" suggestion for digital buyers (with size/price guide)
- Revision flow: show remaining revisions, easy re-submit with new token

---

## Phase 2 — Scale Fulfillment (Weeks 4-8)

### 2a. Physical Print Fulfillment
**Decision tree by size/destination:**

| Destination | Provider | Why |
|-------------|----------|-----|
| US 24x36 | Scalable Press API | $7.20 + ~$4 ship = ~$11 total |
| US ≤18x24 | ShortRunPosters (manual/automation) | Cheapest per-unit |
| International | Prodigi or Gelato API | Local printing, fast delivery |

**Implementation:**
1. Start with Scalable Press API for US orders (they have REST API)
2. Add Prodigi for international
3. ShortRunPosters via web automation (Puppeteer) for US small sizes if volume justifies

### 2b. Print Listing Variants on Etsy
- Create physical print listings at each size point
- Etsy variations: 8x10 ($24.99), 11x14 ($29.99), 18x24 ($39.99), 24x36 ($44.99)
- Set `ETSY_PRINT_LISTING_IDS` in server .env
- A/B test: "Digital + Print" combo listing vs separate listings

### 2c. Pricing Strategy
Based on cost research (see memory/printing_costs_research.md):

| Product | Price | COGS | Etsy Fees | Net Margin |
|---------|-------|------|-----------|------------|
| Digital download | $14.99 | $0 | ~$1.70 | $13.29 (89%) |
| 18x24 print (US) | $39.99 | ~$10 | ~$4.25 | $25.74 (64%) |
| 24x36 print (US) | $44.99 | ~$11 | ~$4.75 | $29.24 (65%) |
| 8x10 print (US) | $24.99 | ~$7.55 | ~$2.75 | $14.69 (59%) |

---

## Phase 3 — Growth & Optimization (Months 2-3)

### 3a. SEO & Etsy Algorithm
- Optimize all 13 tags per listing (long-tail keywords)
- Use Etsy Ads on top-performing listings ($1-5/day budget to start)
- Seasonal pushes: Valentine's Day, Mother's Day, Father's Day, weddings (June), Christmas
- Create event-specific templates (wedding, baby birth, anniversary, memorial)

### 3b. Expand Product Line
- **Canvas prints** — Best margin at high AOV. COGS ~$30-47, sell at $79-120. No glass = cheaper to ship, less breakage.
- **Framed prints** — PrintOps cheapest confirmed: 18x24 = $37+$5 ship = $42 COGS, sell at $79-90. Printful easier integration: ~$33-38 COGS.
- **Framed + mat** — Premium tier. Printful from $35.70+ship. Sell at $109-150. Etsy competitors charge $90-208.
- **Bundled sets** — "His & Hers" star maps, family constellation set
- **New poster types** — topographic/elevation maps, zodiac charts

See `memory/framing_canvas_costs.md` for full provider comparison and margin analysis.

### 3c. Template Gallery & Landing Pages
- Public `/gallery` page showing all templates as a portfolio
- Each template gets a landing page with preview images
- Share links from designer pre-populate a template (`/t/{id}?city=Paris&date=2024-02-14`)
- These become SEO landing pages for long-tail searches

### 3d. Email Marketing
- Collect emails from digital download buyers (they provide email in Etsy order)
- Follow-up sequence: "How did your print turn out?" → upsell framed version
- Abandoned design recovery: if token exists but no order, send reminder (requires opt-in)

---

## Phase 4 — Technical Excellence (Ongoing)

### 4a. Performance
- Code-split admin routes (lazy load)
- Manual chunks: maplibre-gl, d3, admin
- Memoize VectorStarMap with React.memo
- Use Zustand useShallow selectors in SidebarControls
- Target: initial load <600KB (currently ~1.9MB)

### 4b. Component Decomposition
- Split SidebarControls.tsx (2166 lines) into 6 focused panels
- Extract inline editing from VectorStarMap into custom hook
- Extract star/constellation rendering into utility functions

### 4c. Testing
- Playwright tests already scaffolded (10 test files, ~370 tests defined)
- Run and fix: `npm run build && npx playwright test`
- Add visual regression snapshots for all poster modes
- CI pipeline: GitHub Actions → build → test → deploy

### 4d. Reliability
- Webhook signature verification for Etsy/Printify callbacks
- Graceful error handling in render queue (dead letter queue for repeated failures)
- Database backups (daily sqlite dump to S3)
- Uptime monitoring (simple health check ping)

---

## Key Metrics to Track

| Metric | Target (Month 1) | Target (Month 3) |
|--------|-------------------|-------------------|
| Active Etsy listings | 10-15 | 30+ |
| Daily views | 50+ | 500+ |
| Conversion rate | 1-2% | 3-5% |
| Monthly revenue | $200+ | $1,000+ |
| Avg order value | $15-20 | $25-35 |
| Failed renders | <5% | <1% |
| Mobile bounce rate | Track baseline | -30% from baseline |

---

## A/B Testing Framework

### What to Test (in priority order)
1. **Listing images** — lifestyle mockup vs clean product shot vs video thumbnail
2. **Titles** — gift-focused ("Perfect Anniversary Gift") vs product-focused ("Custom Star Map Print")
3. **Price points** — $12.99 vs $14.99 vs $17.99 for digital
4. **Listing descriptions** — short/punchy vs detailed/emotional
5. **Tags** — track which tag combinations drive more impressions

### How to Test
- Create duplicate listings with ONE variable changed
- Run for 2-4 weeks minimum (Etsy algorithm needs time to index)
- Use admin Etsy page performance table (views, favorites) to compare
- Deactivate losers, clone winners with next variable change
- Document findings in admin settings or a shared doc

### Rules
- Never A/B test more than one variable at a time per listing pair
- Keep at least 3 "control" listings unchanged as baseline
- Don't change prices on existing listings mid-test (creates confounding)
- Create fresh duplicates for each new test

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Etsy account suspension | Critical | Follow all TOS, no keyword stuffing, respond to messages within 24h |
| Render failures at scale | High | Queue with retry, dead letter, admin alerts, manual fallback |
| Print quality issues | High | Order samples from each provider before listing, QA checklist |
| Token refresh failure | Medium | Auto-refresh on 401, alert on repeated failures, manual re-auth flow |
| Competitor undercutting | Medium | Focus on UX/customization depth, not price. Add features competitors lack |
| MapLibre tile CDN down | Low | Service worker tile cache provides offline fallback |
