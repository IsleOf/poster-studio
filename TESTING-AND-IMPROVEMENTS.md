# The Mapped Moment — Test Architecture & Improvement Roadmap

> Architect-level review: 2026-04-01
> Covers: deep functional tests, visual regression, mobile viewport, keyboard/mouse emulation, competitive feature gaps

---

## Part 1 — Test Architecture Overhaul

### Current State
- 14 test files, ~8,097 lines, 123 visual baselines
- Chromium-only, single viewport (1440x900)
- No mobile/tablet projects in Playwright config
- Complete mock API (451 lines, 40+ endpoints)
- No shared helpers (duplicated across files)
- No accessibility testing, no performance benchmarks

### Proposed New Playwright Config

```ts
// playwright.config.ts — proposed additions

projects: [
    // Desktop — existing
    {
        name: 'desktop-chrome',
        use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    // Mobile — NEW
    {
        name: 'mobile-iphone',
        use: { ...devices['iPhone 14 Pro'] },  // 393×852, touch, deviceScaleFactor: 3
    },
    {
        name: 'mobile-android',
        use: { ...devices['Pixel 7'] },  // 412×915, touch
    },
    // Tablet — NEW
    {
        name: 'tablet-ipad',
        use: { ...devices['iPad Pro 11'] },  // 834×1194, touch
    },
    // Small desktop — NEW (catches layout issues between mobile/full desktop)
    {
        name: 'desktop-small',
        use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
],
```

### Shared Test Helpers (new file: tests/helpers.ts)

Extract duplicated patterns into one file:
- `waitForDesigner(page)` — SVG + font settle
- `expandAccordion(page, label)` — accordion toggle with aria check
- `cropPoster(page, name)` — poster element screenshot
- `fullShot(page, name)` — full viewport screenshot
- `asAdmin(page)` — navigate + seed JWT
- `scrollSidebar(page, y)` — scroll sidebar container
- `dragElement(page, selector, dx, dy)` — mouse drag sequence
- `pinchZoom(page, selector, scale)` — touch gesture emulation
- `waitForMapTiles(page, timeout?)` — wait for map mode readiness

---

## Part 2 — New Test Suites

### Suite A: Mobile & Responsive Visual Regression

**File:** `tests/mobile-responsive.test.ts`

Tests run on iPhone 14 Pro (393×852) and iPad Pro 11 (834×1194) viewports.

| # | Test Case | What It Verifies | Emulation |
|---|-----------|-----------------|-----------|
| M-01 | Homepage loads at 393px | Layout doesn't overflow, SVG poster visible, no horizontal scroll | iPhone viewport |
| M-02 | Sidebar collapses or stacks below poster | Controls accessible on mobile, poster preview still visible | iPhone viewport |
| M-03 | Accordion sections expand on tap | Touch target ≥44px, accordion content visible after tap | Touch tap emulation |
| M-04 | Template selector on mobile | Templates grid readable, thumbnails visible, tap selects | Touch tap |
| M-05 | City search on mobile | Keyboard opens, dropdown renders within viewport, selection works | Soft keyboard emulation |
| M-06 | Poster pinch-to-zoom (touch) | Two-finger pinch gesture scales poster preview | Touch gesture emulation |
| M-07 | Poster pan on mobile | Single-finger drag pans the preview, not the page | Touch drag |
| M-08 | Download modal on mobile | Modal fits screen, buttons reachable, scroll works | iPhone viewport |
| M-09 | Verify order page mobile | Form usable, keyboard doesn't cover submit button | iPhone viewport |
| M-10 | Admin dashboard tablet landscape | Two-column grid renders, stat cards readable | iPad landscape 1194×834 |
| M-11 | Admin orders page tablet | Table columns fit or scroll horizontally, rows tapable | iPad viewport |
| M-12 | Gallery page mobile | Template cards stack vertically, images load, CTAs visible | iPhone viewport |
| M-13 | Designer at 1024px small desktop | Sidebar + poster both visible, no overlap | 1024×768 |
| M-14 | Font picker overflow on mobile | Font dropdown scrolls, doesn't clip offscreen | iPhone viewport |
| M-15 | Color picker on touch device | Color picker opens, touch-drag selects color, dismissible | Touch emulation |

**Screenshot comparisons:** Each test captures both poster-crop and full-page screenshots at the target viewport. Visual regression against baselines.

---

### Suite B: Deep Drag & Drop / Mouse Emulation

**File:** `tests/drag-interactions.test.ts`

| # | Test Case | Mouse Sequence | Assertion |
|---|-----------|---------------|-----------|
| D-01 | Drag title text to new position | mousedown on title SVG group → mousemove(0, -50) → mouseup | Title transform Y decreased by ~50, offset persisted to store |
| D-02 | Drag subtitle horizontally | mousedown → mousemove(30, 0) → mouseup | Subtitle X offset changed, position sticks after release |
| D-03 | Drag map image inside shape | mousedown on map area → mousemove(100, -80) → mouseup | Map center lat/lng updated, no visual jump after release |
| D-04 | Drag map image — verify no jump bug | Fast drag → release → wait 2s → screenshot | Map stays at dropped position (regression for bug #3) |
| D-05 | Drag title — verify no jump on start | mousedown on title → screenshot immediately | Title still at original position, not jumped (regression for bug #1) |
| D-06 | Drag details font resize handle | mousedown on resize dot → mousemove(0, 20) → mouseup | detailsFontSize increased, text visually larger |
| D-07 | Drag details resize at 2x zoom | Set previewZoom=2 → drag resize handle | Font size change matches expected (dy/previewZoom) |
| D-08 | Double-click title to inline edit | dblclick on title text → type "HELLO" → press Escape | Inline editor opens at correct position, text updates, editor closes |
| D-09 | Inline edit at 1.5x zoom | Set zoom → dblclick title → screenshot | Editor overlay aligns with SVG text (no jump — regression for bug #2) |
| D-10 | Keyboard navigation in inline edit | dblclick → Tab to move between fields → Enter to confirm | Focus moves correctly, Enter saves |
| D-11 | Undo after drag (Ctrl+Z) | Drag title → Ctrl+Z | Title returns to original position |
| D-12 | Drag snapping behavior | Drag title near center → check for snap | Title snaps to center alignment within SNAP_THRESHOLD |

**Implementation pattern:**
```ts
test('D-01 drag title to new position', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/');
    await waitForDesigner(page);

    const title = page.locator('#poster-preview svg text').first();
    const box = await title.boundingBox();

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 50, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(300);
    await cropPoster(page, 'd01-title-dragged');
    // Verify store offset changed
    const offsetY = await page.evaluate(() => (window as any).__zustand?.getState?.()?.titleOffsetY);
    expect(offsetY).not.toBe(0);
});
```

---

### Suite C: Keyboard & Accessibility

**File:** `tests/keyboard-a11y.test.ts`

| # | Test Case | Keystrokes | Assertion |
|---|-----------|-----------|-----------|
| K-01 | Tab navigation through sidebar | Tab × N | Focus ring visible on each interactive element, sequence is logical |
| K-02 | Accordion expand/collapse via Enter | Focus accordion → Enter | Accordion toggles, aria-expanded updates |
| K-03 | City search keyboard navigation | Type "Par" → ArrowDown × 2 → Enter | Second suggestion selected, lat/lng updated |
| K-04 | City search Escape dismissal | Type "Par" → wait for dropdown → Escape | Dropdown closes, input retains text |
| K-05 | Inline edit keyboard flow | Click title → type text → Enter | Text saved, inline editor closes |
| K-06 | Glyph picker keyboard | Open glyph picker → ArrowRight × 3 → Enter | Fourth glyph inserted into text |
| K-07 | Undo/Redo shortcuts | Make change → Ctrl+Z → Ctrl+Shift+Z | State reverts then re-applies |
| K-08 | Download button Enter activation | Tab to Download → Enter | Download modal opens |
| K-09 | Admin login via keyboard | Tab to password → type → Tab to submit → Enter | Login succeeds |
| K-10 | Slider keyboard control | Focus zoom slider → ArrowRight × 5 | Zoom increases by 5 steps |
| K-11 | Escape closes modals | Open download modal → Escape | Modal closes, focus returns to trigger |
| K-12 | Screen reader: SVG has aria-label | Check SVG element | `aria-label="Star map poster preview"` present |
| K-13 | Screen reader: form labels | Check all input elements | Every input has associated label or aria-label |
| K-14 | Color contrast check | Automated axe scan | No WCAG AA violations on text elements |

---

### Suite D: End-to-End User Journeys (Deep)

**File:** `tests/deep-journeys.test.ts`

| # | Journey | Steps | Visual Checkpoints |
|---|---------|-------|-------------------|
| J-01 | First-time visitor → design → download | Land on / → dismiss welcome modal → change city to "Paris" → wait for map → switch to star map → change title → change date → expand Typography → change font → download watermarked PNG | Screenshot at: welcome modal, city loaded, star map rendered, font changed, download modal, after download |
| J-02 | Template URL → customize → save design | Navigate /t/classic-dark → wait for template load → change subtitle → change color → save design (POST /api/designs) → verify token returned | Screenshot at: template loaded, customized state, save response |
| J-03 | Share link roundtrip | Design poster → get share URL → open share URL in new context → verify state matches | Compare poster screenshots between original and shared |
| J-04 | Customer verify + download | Navigate /verify → enter order number → enter token → submit → poll for status → download button appears → click download | Screenshot at: empty form, loading state, ready state with download |
| J-05 | Customer revision flow | Verify order → get download → change design → get new token → re-verify with new token → confirm revision count | Verify revisionsUsed incremented |
| J-06 | Admin: order management flow | Login → dashboard → click order → view detail → add note → change status → go back → verify status updated in list | Screenshot at: dashboard, order detail, after note, after status change |
| J-07 | Admin: template → Etsy publish | Login → templates → new template → fill name → switch to Etsy tab → fill title/price/tags → publish → verify listing ID returned | Screenshot at: empty form, filled form, Etsy tab, after publish |
| J-08 | Admin: fulfillment provider selection | Login → templates → edit template → Fulfillment tab → filter 18x24 framed → select cheapest → save → reload → verify selection persisted | Screenshot at: fulfillment tab, after selection |
| J-09 | Three-mode roundtrip | Start with star map → screenshot → switch to street map → screenshot → switch to colored map → screenshot → switch back to star map → screenshot matches first | 4 poster screenshots, first and last must match |
| J-10 | Shape switching roundtrip | Circle → heart → house → rect → circle | Poster screenshot at each shape, verify clip paths change |

---

### Suite E: Visual Regression — All Poster Permutations

**File:** `tests/visual-poster-matrix.test.ts`

Generate visual baselines for the full matrix:

```
3 modes × 4 shapes × 2 color schemes = 24 permutations
```

| Mode | Shape | Theme | Screenshot Name |
|------|-------|-------|-----------------|
| starmap | circle | dark | `matrix-starmap-circle-dark.png` |
| starmap | circle | light | `matrix-starmap-circle-light.png` |
| starmap | heart | dark | `matrix-starmap-heart-dark.png` |
| starmap | heart | light | `matrix-starmap-heart-light.png` |
| starmap | house | dark | `matrix-starmap-house-dark.png` |
| starmap | house | light | `matrix-starmap-house-light.png` |
| starmap | rect | dark | `matrix-starmap-rect-dark.png` |
| starmap | rect | light | `matrix-starmap-rect-light.png` |
| streetmap | circle | dark | `matrix-streetmap-circle-dark.png` |
| ... | ... | ... | ... (16 more) |

**Implementation:** Use parameterized tests:
```ts
const MODES = ['starmap', 'streetmap', 'coloredmap'] as const;
const SHAPES = ['circle', 'heart', 'house', 'rect'] as const;
const THEMES = ['dark', 'light'] as const;

for (const mode of MODES) {
    for (const shape of SHAPES) {
        for (const theme of THEMES) {
            test(`${mode}-${shape}-${theme}`, async ({ page }) => {
                // Set store state, capture poster
            });
        }
    }
}
```

---

### Suite F: Admin Page Visual Regression (All States)

**File:** `tests/visual-admin.test.ts`

| # | Page | State | Viewport |
|---|------|-------|----------|
| A-01 | Login page | Empty form | Desktop + mobile |
| A-02 | Login page | Wrong password error | Desktop |
| A-03 | Dashboard | With data (7d range) | Desktop + tablet |
| A-04 | Dashboard | With data (30d range) | Desktop |
| A-05 | Dashboard | Empty state (no orders) | Desktop |
| A-06 | Orders list | Default view with 7 orders | Desktop + tablet |
| A-07 | Orders list | Filtered by "failed" status | Desktop |
| A-08 | Orders list | Search by buyer name | Desktop |
| A-09 | Order detail | Digital order (status: sent) | Desktop + mobile |
| A-10 | Order detail | Print order (status: fulfilled) | Desktop |
| A-11 | Order detail | Failed order with error | Desktop |
| A-12 | Order detail | With seller notes | Desktop |
| A-13 | Queue page | 3 items, mixed status | Desktop |
| A-14 | Templates list | 3 templates, mixed active | Desktop + tablet |
| A-15 | Template editor | Template Details tab | Desktop |
| A-16 | Template editor | Etsy Listing tab (filled) | Desktop |
| A-17 | Template editor | Fulfillment tab (with data) | Desktop |
| A-18 | Etsy page | Connected state | Desktop |
| A-19 | Etsy page | Not connected state | Desktop |
| A-20 | Settings page | All fields | Desktop + mobile |
| A-21 | Analytics page | With events | Desktop |
| A-22 | Assets page | With uploads | Desktop |

---

### Suite G: Error & Edge Case Stress Tests

**File:** `tests/stress-edge.test.ts`

| # | Test Case | Setup | Assertion |
|---|-----------|-------|-----------|
| E-01 | SVG renders with 0-length title | Set title="" | No crash, text group still exists but empty |
| E-02 | Very long title (200+ chars) | Set title to 200-char string | Text truncates or wraps, no overflow outside SVG |
| E-03 | Unicode in title | Set title to "星の地図 ★ Ñoño" | Characters render, no encoding errors |
| E-04 | Emoji in subtitle | Set subtitle to "❤️ 🌟 Our Night" | Emojis render (may be squares on server — document this) |
| E-05 | Date at epoch boundary | Set date to "1970-01-01" | Star chart renders (may be empty sky — acceptable) |
| E-06 | Date far future | Set date to "2099-12-31" | No crash, star positions calculated |
| E-07 | Location at poles | Set lat=90, lng=0 | Star chart renders (all-horizon projection) |
| E-08 | Location at date line | Set lat=0, lng=180 | No wrap-around bugs |
| E-09 | Rapid mode switching | starmap→streetmap→coloredmap×10 fast | No crashes, final mode renders correctly |
| E-10 | Rapid slider manipulation | Move zoom slider to min→max 20 times fast | No performance degradation, final value correct |
| E-11 | Window resize during render | goto / → resize to 800×600 → resize to 1440×900 | SVG scales correctly, no persistent artifacts |
| E-12 | Browser back/forward | Design → navigate to /verify → browser back | Designer state restored from URL or store |
| E-13 | Network failure during city search | Mock Nominatim to return 500 → type city name | Error toast shown, no hang, retry button visible |
| E-14 | Offline mode | Block all network → navigate to / | Service worker serves cached tiles, star data from cache, app usable |
| E-15 | Large poster export (4x DPI) | Trigger 300 DPI export of 24x36" | No memory crash, PNG file valid |

---

## Part 3 — Creative Improvements (Competitor-Informed)

### Tier 1 — Revenue Unlocks (do first)

#### 1.1 Heart Mask Shape
**Why:** Single most popular shape for couples/anniversary/wedding market. Every major competitor has it. We have the infrastructure (`maskShape` in store + VectorStarMap clip paths) — just need the SVG path.

**Impact:** Opens the largest Etsy gift category (anniversary gifts).

**Effort:** Small — add heart SVG path to VectorStarMap, add "Heart" to shape selector.

*Wait — we already have heart shape!* Verify it's working and well-tested.

#### 1.2 Dual/Split Poster Layout
**Why:** "Where we met + Where we married" is a top seller at CraftOak ($69+) and StarryMaps. Two star charts side by side, or one star + one map.

**Implementation:** New `maskShape: 'dual-circle'` that renders two circles side by side. Each half has its own location/date. Store needs `secondaryLat`, `secondaryLng`, `secondaryDate`, `secondaryTime`, `secondaryLocation`. VectorStarMap renders two projections.

**Impact:** Unlocks the wedding market segment. Average order value 50-100% higher than single poster.

#### 1.3 Template Gallery as Landing Page
**Why:** Mapiful, CraftOak, and Canva all use a template gallery as the primary entry point. Currently our templates are buried in a sidebar accordion section. Visitors land on a blank-ish designer and don't know where to start.

**Implementation:**
- Make `/gallery` or `/` show a beautiful template grid with lifestyle mockup thumbnails
- Each template is clickable → opens the designer pre-loaded with that template
- "Start from scratch" option for power users
- Add template categories: "Anniversary", "Wedding", "New Baby", "New Home", "Memorial"

**Impact:** Reduces bounce rate (blank canvas anxiety), increases engagement.

#### 1.4 "See It On Your Wall" Room Preview
**Why:** Minted and Mapiful offer this. Major conversion driver — turns abstract poster into "I can see this in my living room."

**Implementation:**
- Upload room photo → detect wall area (simple rectangle selection, not AI)
- Overlay poster at correct scale based on selected print size
- Or: provide 6-8 pre-built room scenes (modern living room, nursery, bedroom, office, etc.)

**Impact:** Competitors with room previews report 30-40% higher conversion rates.

#### 1.5 Gift-Specific Features
**Why:** 70%+ of star map purchases are gifts. The entire purchase experience should cater to gift-givers.

**Features:**
- **Gift wrapping option** (+$7.95 upsell on physical orders)
- **Gift message card** (+$3.95, printed card with custom message)
- **Ship to different address** (already possible via Etsy, but make it prominent)
- **Gift cards** — buyer purchases a gift card, recipient designs their own poster. Recurring revenue and zero fulfillment risk.
- **"Surprise reveal" link** — send a link that reveals the poster with an animation

**Impact:** Higher AOV, more impulse purchases, new revenue stream (gift cards).

---

### Tier 2 — UX & Conversion Optimization

#### 2.1 Mobile-Responsive Designer (Priority #1 for traffic)
**Why:** 60%+ of Etsy referral traffic is mobile. If they can't use the designer on their phone, they bounce.

**Layout:**
```
Mobile (< 768px):
┌──────────────┐
│ Poster Preview│  ← fixed top, ~40vh, pinch-to-zoom
│   (touch pan) │
├──────────────┤
│ Quick Actions │  ← mode/shape/template switcher
├──────────────┤
│   Controls   │  ← scrollable accordion below
│   (scroll)   │
└──────────────┘
```

**Key interactions:**
- Two-finger pinch/zoom on poster preview
- Single-finger drag to pan poster
- Accordion sections expand/collapse on tap (44px min touch targets)
- Bottom sheet for color picker, font picker, city search

#### 2.2 Progressive Disclosure in Sidebar
**Why:** SidebarControls.tsx is 2166 lines. New users are overwhelmed by options.

**Implementation:**
- Show "Essential" mode by default: poster type, shape, city/date, title text, color theme presets
- "Advanced" toggle reveals: individual font controls, kerning, offsets, grid opacity, star scale, etc.
- Remember user preference in localStorage

#### 2.3 Quick Design Presets (One-Click Magic)
**Why:** Mixtiles succeeds because of extreme simplicity. Many users want "beautiful poster in 30 seconds."

**Implementation:**
- Prominent "Quick Start" button on landing
- 3-step flow: (1) Pick occasion (anniversary, wedding, baby, home), (2) Enter date + location, (3) Pick from 3 pre-styled options → done
- Auto-generates title/subtitle from the occasion and date
- "Customize further" link for power users

#### 2.4 Price Anchoring in UI
**Why:** Mapiful shows framed price first (€79), then poster (€45) feels like a deal. Psychological pricing.

**Implementation:**
- In the download/order section, show framed price first with "Most Popular" badge
- Then poster, then digital
- "Save $X with digital download" framing

#### 2.5 Urgency & Social Proof
**Features:**
- "X people designed a poster today" counter (from analytics events table)
- Seasonal deadline banners: "Order by Dec 15 for Christmas delivery"
- "Perfect for Mother's Day — May 11, 2026" contextual prompt
- Review/testimonial carousel (once we have real orders)

---

### Tier 3 — Product Line Expansion

#### 3.1 Overlay Modes — Combined Star + Map
**Why:** No competitor offers a star map overlaid on a street map. We have both renderers — combine them.

**Implementation:** New `posterType: 'combo'` that renders StreetMapCapture as background at reduced opacity, with star chart on top. Creates a unique "your city under your stars" effect.

#### 3.2 Landscape Orientation
**Why:** Simple toggle, opens horizontal wall spaces (above couch, above bed headboard).

**Implementation:** Swap width/height in VectorStarMap SVG viewBox. Adjust text layout to horizontal orientation.

#### 3.3 Hexagon Mask Shape
**Why:** CraftOak offers hexagon. Modern, geometric aesthetic. Popular in the "modern minimal" home decor segment.

**Implementation:** Add hexagon SVG clip path, similar effort to adding any other shape.

#### 3.4 Foil Accent Simulation
**Why:** Gold/silver/rose gold foil text is CraftOak's top-selling premium option.

**Implementation:** SVG filter that simulates metallic gradient on text elements. Preview only — actual foil printing requires specialty fulfillment partner.

#### 3.5 Spotify Code Integration
**Why:** "The song that was playing" — embed a Spotify scan code on the poster. Bridges physical and digital.

**Implementation:** Spotify codes are publicly accessible at `scannables.scdn.co/uri/plain/png/...`. User enters a Spotify track URL → render the code as an SVG element below the text area.

#### 3.6 QR Code to Personal Page
**Why:** StarryMaps charges $4.99 extra for this. QR links to a mini-page with photos, music, and the story behind the date.

**Implementation:** Generate QR code SVG → embed in poster corner. Link goes to `/moment/{token}` which shows photos and text the buyer uploaded.

---

### Tier 4 — Business Model Innovation

#### 4.1 "Design for Me" Concierge (+$19.99)
**Why:** PosternAste charges €15 for this. Many gift-givers don't want to design it themselves. They just want to provide the date/location/occasion and receive a beautiful poster.

**Implementation:** New Etsy listing type: buyer provides details in personalization notes → admin creates the design → sends for approval → fulfills.

#### 4.2 Gift Cards
**Why:** Perfect for gift-givers who want the recipient to design their own. Zero fulfillment risk, 100% margin minus payment processing.

**Implementation:**
- Etsy listing for "The Mapped Moment Gift Card" at $25, $50, $75, $100
- Generates a unique redemption code
- Recipient redeems at `/redeem` → gets credit applied to any poster order
- Gift card codes stored in `settings` or new `gift_cards` table

#### 4.3 Subscription / "Memory Collection"
**Why:** Recurring revenue. "Baby's First Year" = 12 monthly star maps showing the sky on each month-birthday.

**Implementation:**
- "Memory Collection" product: customer signs up for 12 designs over 12 months
- Pre-pay at discount ($99 for 12 digital, vs $12.99 each = $155.88)
- System auto-generates each month's poster on the monthly anniversary date
- Email delivery with download link

#### 4.4 B2B / Corporate Gifting
**Target customers:**
- Real estate agents (closing day star map as client gift — bulk orders 10-50/month)
- Wedding planners (table centerpiece star maps)
- HR departments (employee start-date sky as onboarding gift)
- Event planners (fundraiser gala star maps)

**Implementation:** Bulk order form with CSV upload of dates/locations/names. Volume pricing.

#### 4.5 Seasonal Limited Editions
- Valentine's collection (February): heart shape, romantic color palettes, "Our Love Under the Stars"
- Mother's Day (May): birth-date star maps, "The Night You Made Me a Mom"
- Wedding season (June-September): dual star maps, "Where We Said I Do"
- Christmas (November-December): winter color palettes, "Silent Night" star maps, gift wrap emphasis
- Create time-limited template designs, promote on Etsy with seasonal tags

---

### Tier 5 — Technical Moat (hard to copy)

#### 5.1 Astronomical Accuracy Marketing
**Why:** Many Etsy competitors use decorative/fake star patterns. Reviewers complain: "I checked and the stars don't match." Our d3-celestial data is real.

**Action:** Add "Astronomically verified" badge to listings and designer UI. Include a small accuracy disclaimer. This becomes a marketing differentiator.

#### 5.2 Multi-Language Support
**Why:** Etsy is global. A French buyer wants "Les étoiles au-dessus de Paris" not "The stars above Paris."

**Implementation:** i18n on the UI chrome (sidebar, buttons, modals). Poster text is already user-entered. Add common auto-translations for subtitle format strings ("The night sky above {city} on {date}").

#### 5.3 API for Third-Party Integrations
**Why:** Wedding websites (The Knot, Zola), baby registries (Babylist), and corporate gifting platforms could embed our designer.

**Implementation:** Embeddable iframe widget + public API for programmatic poster generation. Revenue via API key licensing or per-render fee.

---

## Part 4 — Improvement Priority Matrix

| Improvement | Revenue Impact | Effort | Priority |
|-------------|---------------|--------|----------|
| Mobile responsive designer | Critical (60% traffic) | Large (2-3 weeks) | P0 |
| Template gallery landing page | High (reduces bounce) | Medium (1 week) | P0 |
| Dual/split poster layout | High (new market segment) | Medium (1-2 weeks) | P1 |
| Gift cards | Medium (new revenue stream) | Small (2-3 days) | P1 |
| "See it on your wall" preview | High (conversion) | Medium (1 week) | P1 |
| Quick design presets | Medium (reduces friction) | Small (3-4 days) | P1 |
| Gift wrap / gift message upsell | Medium (AOV increase) | Small (2-3 days) | P1 |
| Price anchoring in UI | Medium (AOV) | Tiny (1 day) | P1 |
| Landscape orientation | Small (niche) | Small (2-3 days) | P2 |
| Combined star+map overlay | Medium (unique feature) | Medium (1 week) | P2 |
| Hexagon mask shape | Small | Tiny (1 day) | P2 |
| Spotify code integration | Small (novelty) | Small (2-3 days) | P2 |
| QR code personal page | Medium | Medium (1 week) | P2 |
| "Design for me" concierge | Small-Medium | Small (process, not code) | P2 |
| Foil accent simulation | Medium (premium tier) | Medium (1 week) | P2 |
| Seasonal limited editions | Medium | Small (design, not code) | P2 |
| Subscription collections | Medium (recurring) | Large (2 weeks) | P3 |
| B2B bulk ordering | Medium | Large (2 weeks) | P3 |
| Multi-language i18n | Medium (global) | Large (2 weeks) | P3 |
| Embeddable widget API | Small-Medium | Large (3+ weeks) | P3 |
| Astronomical accuracy marketing | Small (trust) | Tiny (copy changes) | P1 |
| Progressive disclosure sidebar | Medium (UX) | Medium (1 week) | P2 |
| Social proof / urgency | Small-Medium | Small (2-3 days) | P2 |

---

## Part 5 — Competitor Quick-Reference

| Competitor | Strength | Weakness | Our Opportunity |
|------------|----------|----------|----------------|
| StarryMaps | Heart overlay, QR codes, polished UX | No street maps, no colored maps | Our 3 map modes are unique |
| CraftOak | Dual poster, foil accents, hexagon shape | Higher prices ($39-$169) | Undercut on price with similar features |
| Mapiful | Best designer UX, mobile responsive, route overlay | No star map mode, EU-focused | US market + star maps |
| TheStarPoster | Rush processing, gift wrap, simple UX | No interactive designer, limited options | Superior customization |
| Etsy sellers | Massive reach, low prices ($3.99 digital) | Manual process (24-48h), fake star data | Instant generation + real data |
| Canva | Template-first UX, massive user base | Not specialized, no astronomy data | Niche expertise + quality |

---

## Part 6 — Implementation Recommendations

### This Week
1. Write and run mobile viewport tests (Suite A) to understand current mobile breakage
2. Add mobile Playwright projects to config
3. Implement shared test helpers
4. Create Suite D deep journey tests
5. Fix the 4 known bugs from the plan file

### Next 2 Weeks
1. Mobile responsive layout (stacked, touch-friendly)
2. Template gallery landing page redesign
3. Visual regression matrix tests (Suite E)
4. Price anchoring in download/order UI

### Month 2
1. Dual/split poster layout
2. Gift cards
3. Room preview feature
4. Quick design presets
5. Full drag/keyboard test suites (Suite B, C)

### Month 3+
1. Spotify/QR code integrations
2. Landscape orientation
3. Combined star+map overlay mode
4. Seasonal template collections
5. B2B bulk ordering
