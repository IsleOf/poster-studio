# Session Handover — Apr 25, 2026

> Read this BEFORE you read CLAUDE.md, HANDOVER.md, or PLAN.md.
> Those documents describe long-lived rules. This one describes the **current uncommitted state**, what the previous sessions actually did, and what to do next.

---

## TL;DR — Where the project is right now

1. **Last commit is stale.** `0b9e2a6 Add admin dashboard, fulfillment pricing, Etsy integration, tests, and docs` (Apr 11). Since then there have been ~140 user prompts of work that is **not committed**.
2. **52 files have uncommitted changes** (+3,618 / −2,528 lines). All real code is in the working tree, not in git.
3. **Build passes, TypeScript clean, visual tests pass 22/22** (verified in this session).
4. **PLAN.md is partly outdated** — it lists "Mobile responsive layout" as Phase 1 but it's already implemented. Verified via screenshots.
5. **Production at https://themappedmoment.com is live** but has 0 published Etsy listings and 0 real orders.

The actual blocker for making money is not technical work — it's publishing Etsy listings and running an end-to-end test purchase. The codebase is more capable than the business is using.

---

## What the previous big session built (Apr 14–23)

Session ID `62615d04-02ed-4df7-938e-421b98f344bd` (174 MB JSONL, ~140 user prompts). This is the source of all uncommitted code. Highlights:

### New design system fields (all in store, applyTemplate, renderer, sidebar, exports)
| Field | Purpose |
|-------|---------|
| `showNames`, `namesFont`, `namesFontSize`, `namesOffsetY`, `namesKerning` | Couple/names text element (used by Design002+) |
| `showInnerRing`, `innerRingWidth`, `innerRingInset` | White ring inside the map circle |
| `showOuterRing`, `outerRingWidth`, `outerRingGap` | Extra circle outside the map circle |
| `showVertSep`, `vertSepHeight`, `vertSepThickness`, `vertSepOffsetY` | Independent vertical divider (sits between location and date) |
| `showHeartDecor`, `heartDecorOffsetY` | Standalone decorative heart toggle |
| `shapeOffsetX`, `snapEnabled` | Horizontal shape offset + snap-to-vertical-center guide |
| `titleAllCaps` | Uppercase toggle for title text |

These are wired through the full lifecycle (store → applyTemplate → VectorStarMap → SidebarControls → renderPoster → DownloadButton → server-side STYLE_SYNC_FIELDS in templates.js). Verified by reading the diffs.

### New designs (created via admin + script)
- Design001 — original starmap (Classic Dark style)
- Design002 — added names line, inner/outer rings, divider variant
- Design003 — Calligraphy002 (Houstonfield) title font, fineline removed, white inner ring
- Design004 — Title002 (Brittany Signature) calligraphy, frame, names+date+location layout
- Design005 — black-background variant of 004
- Design006 — Title004 (Alex Brush) names font + Typewriter lower text, vertical divider

### New fonts (stripped of creator metadata, renamed)
- `Title001` ← Quiche Display
- `Title002` ← Brittany Signature
- `Title004` ← Alex Brush
- `Details001` ← Brandon Grotesque
- `Calligraphy002` ← Houstonfield
- `Typewriter` ← (typewriter-style font)
- `Mapped2` (existing custom sans)

All have base64-embedded data URIs in `fontRegistry.ts` for PNG download font embedding.

### Other features added
- **PDF export** in DownloadButton (uses `jspdf`). Must only appear in `isTemplateMode` (admin) — NOT in customer view (CLAUDE.md gotcha #5 in the existing troubleshooting).
- **Silent download** in VerifyOrder — fetches as blob, masks file extension, dispatches click without DOM insertion. Designed to make it harder to abuse downloads.
- **Drag-to-position shape** in preview window (with snap-to-center guide).
- **Inline editable dividers** — double-click the horizontal divider to drag-resize length and thickness in the preview.
- **`useShallow` selector** in VectorStarMap (Zustand perf optimization from PLAN.md Phase 4a).
- **Vitest** added for unit tests (`npm run test:unit`).
- **bcryptjs**, **morgan**, **zod** server deps added.

### Documentation already updated by previous session
The previous session DID update `CLAUDE.md` and `HANDOVER.md` with most of these gotchas before it ended. The "Troubleshooting" section in CLAUDE.md and the "Known Failure Modes" section in HANDOVER.md already cover:
- listing_templates is mandatory
- listing API must NOT deduplicate
- poster type toggle hidden in customer mode
- PDF removed from customer download modal
- design card thumbnail aspect ratio
- design card sort order via `position`

So: **do not re-document those.** They're already in the existing markdown.

---

## What this session (Apr 25) did

1. **Read all docs and the previous session's last 200 messages** to understand state.
2. **Ran visual tests** — found 3/22 failing because `waitForLoadState('networkidle')` times out (D3-celestial CDN never settles).
3. **Fixed `waitForSvg` in `tests/visual.test.ts`** — replaced `networkidle` with a star-circle-count check (>50 circles) + 5s race fallback, mirroring the working pattern already used in the home-street test.
4. **Updated visual snapshot baselines** (`npx playwright test --update-snapshots`) to match the rendering output that includes the new rings/names/divider/etc.
5. **Verified mobile layout already works** by reading the existing screenshots (`vp-60-mobile-designer.png`, `comp-30-mobile.png` etc.). Saved `memory/project_mobile_done.md` to stop future sessions thinking Phase 1a is open.
6. **Added per-design URLs for A/B testing** — new route `/l/:slug/:designSlug` (e.g. `/l/star-map-night-we-met/design002`). When a customer clicks a different design card, the URL updates via `replace`. Two new analytics events: `design_view` (fired on listing load with the resolved designGroupId) and `design_select` (fired when user picks a different card). `designSlug` resolves to a design group via exact id match, trailing `designNNN` segment, or kebab-cased group name.
7. **Rewrote `PLAN.md`** to reflect actual current state (mobile done, 6 designs done, 3,600 lines uncommitted, A/B testing now possible) and updated phases. New focus: lock in uncommitted work, ship to Etsy, then run design-thumbnail A/B tests.
8. **Updated `CLAUDE.md`** with the listing URL section.
9. **Did NOT commit anything.** The uncommitted files are still uncommitted.

### Files touched in this session
- `src/App.tsx` — added second `/l/:slug/:designSlug` route
- `src/components/MainLayout.tsx` — read `designSlug` param, resolve to target design group, fire `design_view`
- `src/components/SidebarControls.tsx` — `useParams` for listing slug, derive `designGroupSlug()`, update URL on design card click via `navigate(..., { replace: true })`, fire `design_select`
- `tests/visual.test.ts` — `waitForSvg` no longer uses `networkidle`
- `tests/snapshots/visual.test.ts-snapshots/` — 4 baselines regenerated
- `CLAUDE.md` — listing URL patterns section added
- `PLAN.md` — full rewrite reflecting current state
- `SESSION_HANDOVER.md` — this file

Final test result: **22/22 passing**, 1 flaky verify-page Chromium screenshot protocol error (not code-related, retries pass). Build passes. TypeScript clean.

---

## What you (the next agent) should do

### Priority 0 — Lock in the work that exists (do this first)
The single biggest risk right now is losing 3,600 lines of working code to a `git reset` or disk crash. Before starting any new work:

```bash
# Look at what's actually changed (skip test report noise)
git status -s | grep -v 'tests/report' | head -50
git diff HEAD --stat -- ':!tests/report'
```

Then **propose a commit plan to the user** before committing. Reasonable groups:
- Commit 1: New design fields (store, applyTemplate, renderer, sidebar, renderPoster, DownloadButton)
- Commit 2: Visual test fix + updated snapshots
- Commit 3: Documentation updates (CLAUDE.md, HANDOVER.md, PLAN.md)
- Commit 4: Package deps (bcryptjs, jspdf, morgan, zod, vitest)

Don't commit `tests/report/` artifacts — they're transient.

**Do not commit unless the user agrees.** This is a multi-week change that may have intentionally been left uncommitted.

### Priority 1 — Verify nothing broke
After committing (or before, if safer):
```bash
npm run build              # must succeed
npx playwright test        # full suite, expect ~93 passing
node scripts/sync-listing-state.cjs  # local DB sanity
```

If sync-listing-state reports anything other than "✓ All state is consistent", investigate before doing anything else.

### Priority 2 — Confirm production parity
The user has reported repeatedly that local and production drift on:
- Design names
- Thumbnail paths and aspect ratios
- `listing_templates.position` ordering
- `printSize` vs `fulfillment_size`
- `titleAllCaps` per design

After local is clean, sync prod:
```bash
scp scripts/sync-listing-state.cjs ubuntu@13.210.227.152:/home/ubuntu/poster-studio/scripts/
ssh ubuntu@13.210.227.152 "node /home/ubuntu/poster-studio/scripts/sync-listing-state.cjs --db /home/ubuntu/poster-studio/server/data/db.sqlite"
node scripts/verify-listing.cjs  # visual diff local vs prod
```

### Priority 3 — Actual roadmap
Per `PLAN.md` Phase 0 (still valid):
1. Publish 2–3 Etsy digital listings via the admin Etsy page
2. Set `ETSY_DIGITAL_LISTING_IDS` in `server/.env` on prod
3. Set up daily sqlite backup cron on the VPS
4. End-to-end test purchase before any marketing
5. Enable `ENABLE_LOCAL_RENDER=true` and `FRONTEND_URL` on prod, confirm 2GB swap exists

The codebase is **ready** for Phase 0. The blocker is that no real listings have been published and no real money has flowed through.

---

## What NOT to do

These all came up repeatedly in the last session and burned hours:

1. **Do not deduplicate templates in `/api/listings/:slug` server response.** The size picker breaks. Grouping happens client-side in `MainLayout.tsx`.
2. **Do not remove `--exclude='designs/'` from rsync deploy commands.** It will wipe production thumbnails.
3. **Do not put PDF export in the customer-facing download modal.** It gives away full-quality vector files for free. Keep it inside `isTemplateMode`-only branches.
4. **Do not leave `listing_templates.position` defaulted to 0 after creating new designs.** Cards display in random order. Always set position to design rank.
5. **Do not ship a design without running both `sync-listing-state.cjs` AND `verify-listing.cjs`.** The "design works locally but not on prod" loop is an entire afternoon every time.
6. **Do not screenshot designer pages immediately after navigation** — D3-celestial loads async. Wait for >50 circles or use `capture-thumbnails.cjs`.
7. **Do not use `waitForLoadState('networkidle')` on starmap or maplibre tests.** It never settles, tests time out at 30s. Use `waitForFunction(() => circles > 50)` or a `Promise.race` with `waitForTimeout(5000)`.
8. **Do not rename design groups.** The user has been explicit: keep the names `Design001..Design006` in numeric order. Do not "improve" them to descriptive names.
9. **Do not amend or rebase commits without asking.** The user prefers new commits.
10. **Do not skip steps in the design creation workflow.** All 8 steps (template insert + listing_templates row + sync + thumbnail in BOTH locations + cache-bust + build + deploy + verify) are necessary. Skipping any one of them is what caused the recurring "design appears on local but not on prod" bugs.

---

## File structure of the new design fields (cheat sheet)

When the user reports a new bug with one of the recently added elements, here's where to look:

| Field | Store | applyTemplate | Renderer | Sidebar | Server sync |
|-------|-------|---------------|----------|---------|-------------|
| Names text | `useStore.ts` lines around 90, 120 | `applyTemplate.ts` TEMPLATE_FIELDS + CUSTOM_TEXT_KEYS | `VectorStarMap.tsx` text-rendering useEffect | SidebarControls visibility + content + typography sections | `templates.js` STYLE_SYNC_FIELDS for `namesFont`/`namesKerning`/`showNames` (NOT `namesFontSize` or `namesOffsetY` — those are layout, per-aspect-ratio independent) |
| Inner/outer ring | `useStore.ts` showInnerRing etc. | `applyTemplate.ts` defaults + TEMPLATE_FIELDS | `VectorStarMap.tsx` shape-rendering useEffect | SidebarControls Shape section | (style fields) |
| Vertical separator | `useStore.ts` showVertSep, vertSepHeight, vertSepThickness, vertSepOffsetY | `applyTemplate.ts` | `VectorStarMap.tsx` — must be rendered INDEPENDENTLY of `detailsOffsetY`, see prior session learning | SidebarControls Visibility + Style sections | |
| `titleAllCaps` | `useStore.ts` | `applyTemplate.ts` | `VectorStarMap.tsx` (uppercases the rendered title) | SidebarControls Title section | `templates.js` STYLE_SYNC_FIELDS — yes |

All of these follow the **New Text Element Checklist** in `CLAUDE.md` — re-read it before adding more.

---

## Useful artifacts from this session

- **Updated visual snapshot baselines** in `tests/snapshots/visual.test.ts-snapshots/` (4 files regenerated to match new rendering)
- **Fixed `tests/visual.test.ts:waitForSvg`** — no longer uses `networkidle`
- **Memory note** `memory/project_mobile_done.md` — stops future sessions from re-implementing mobile layout

---

## Where to find prior session context

If you need to see what the user actually said over the previous 140 prompts:
```bash
# The big session JSONL (174 MB):
ls -la /home/dev/.claude/projects/-home-dev-poster-studio/62615d04-02ed-4df7-938e-421b98f344bd.jsonl

# Extract user prompts only:
python3 -c "
import json, sys
with open('/home/dev/.claude/projects/-home-dev-poster-studio/62615d04-02ed-4df7-938e-421b98f344bd.jsonl', 'rb') as f:
    f.seek(0, 2); size = f.tell()
    f.seek(max(0, size - 50*1024*1024))
    data = f.read().decode('utf-8', errors='replace')
for line in data.strip().split('\n'):
    try:
        obj = json.loads(line)
        if obj.get('type') == 'user' and 'entrypoint' in obj:
            for c in obj.get('message', {}).get('content', []):
                if c.get('type') == 'text' and len(c.get('text','').strip()) > 10:
                    print('---'); print(c['text'][:500])
    except: pass
"
```

The **current** session (Apr 25) is in `bc853f97-c290-4810-a65f-606d45123fea.jsonl`.

---

## When in doubt

Check in order:
1. `SESSION_HANDOVER.md` (this file) — current state
2. `CLAUDE.md` — project rules, troubleshooting, design workflow
3. `HANDOVER.md` — architecture, schema, deployment, gotchas
4. `PLAN.md` — roadmap, but treat Phase 1a (mobile) as DONE
5. `memory/MEMORY.md` — persistent user preferences

If a doc contradicts current code, trust the code and update the doc.
