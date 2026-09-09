# Shop Session Handoff — 2026-06-04

Work completed on the **poster-studio / TheMappedMoment Etsy shop** in this session. All items below
are **deployed to production** (frontend `dist` rsynced, server rsynced + `poster-studio-api`
restarted) unless marked otherwise. Local working tree changes are **not yet committed to git** — see
[§ Git state](#git-state).

Production: `https://themappedmoment.com` · EC2 `3.107.34.169` · Etsy shop `TheMappedMoment` (12648302).

---

## 1. Size lock fix (reported bug: "size still changeable")
The 12-size **design-group** size picker ignored `lockedPrintSize`, so a locked order could still
switch sizes. Fixed.
- `src/components/SidebarControls.tsx` — the `designGroups` size buttons now have
  `isDisabled={!!lockedPrintSize}` + a "Locked to <size> — this matches your order and can't be changed"
  notice (around lines 298, 308). The standalone 5-size picker already respected it (~lines 531/545).

## 2. Digital orders: size UNLOCKED (physical stays locked)
Digital buyers bought a *file*, not a print size, so their editor link must not lock size. Physical
(print/framed) still locks to the purchased size (Prodigi cost is size-bound).
- `server/routes/verify.js` — digital download response builds the editor URL **without** `?lockedSize=`.
- `server/services/etsy.js` — order-received email: `lockedSize` only when `listingType !== 'digital'`.
- `server/services/renderQueue.js` — digital "poster ready" email: unlocked editor URL.

## 3. Order confirm-mode UI (size-mismatch confirmation) — validated live
When an order is `awaiting_size_confirm`, the editor shows a confirm panel instead of the shopping UI.
- `server/routes/verify.js`:
  - `GET /api/order-status/:token` (~L408) → `{found, orderId, listingType, printSize, status, confirmRequired}`
    (`confirmRequired` true only when `status==='awaiting_size_confirm'`).
  - `POST /api/confirm-order` (~L428) → validates token+awaiting status, saves edited `state_json`, sets
    `status='pending'`, clears `render_path`, `enqueueRender()` → re-enters the normal profitability-gated
    pipeline (no Prodigi bypass).
- `src/components/SidebarControls.tsx` — `OrderSection` reads the route token (`/d/:designToken`), calls
  `order-status`, and on `confirmRequired` renders only the confirm panel ("Confirm your order → ✓ Confirm
  & send to production"). `buildSnapshot()` was extracted so save + confirm share the state snapshot.
- **Validated on prod by the user** (edit → confirm → "in production" success state observed).

## 4. Digital edit/revision window = 30 days (was 7)
Anti-abuse backstop so a single digital sale can't be used as an unlimited free design tool.
- `server/routes/verify.js` — revision branch: if order age > `digital_edit_window_days` (default **30**,
  env `DIGITAL_EDIT_WINDOW_DAYS`) → 403 `editWindowClosed` with a **warm** message pointing to
  studio@themappedmoment.com. Still capped at 3 revisions (`max_revisions`).
- Signed download links extended to **30 days** (`verify.js` `buildDownloadUrl`, `renderQueue.js`).
- `server/db.js` seeds `digital_edit_window_days='30'`. **Prod setting explicitly set to `30`** (tunable
  with no redeploy).

## 5. Inbound message triage (studio@ email)
Classifies inbound mail, matches it to an order, and escalates to the owner with a draft reply.
- `server/services/messageTriage.js` (new) — `triageEnabled()`, `fetchResendInboundBody(emailId)`,
  `triageInboundEmail({from,subject,body})`. LLM classify (category/urgency/summary/suggested_reply/
  needs_human) with keyword fallback; **complaint/refund_dispute force needs_human**.
- `server/services/email.js` — `sendTriageEscalation(...)` (~L308) emails `EMAIL_FORWARD_TO` with a
  metadata table + "DRAFT REPLY — review before sending" + collapsible original.
- `server/routes/webhooks.js` — `/webhooks/email-inbound` backfills the body via Resend API when needed,
  triages when enabled (skips the raw forward to avoid double-send), else falls back to plain forward.
- `server/db.js` seeds `enable_message_triage='true'`.
- **Gating:** active only if `ENABLE_MESSAGE_TRIAGE != '0'` AND `EMAIL_FORWARD_TO` is set.
- ⚠️ **Requires a Gmail auto-forward rule** (Etsy notifications → studio@themappedmoment.com) before it
  receives anything — nothing in code can set that. See pending actions.

## 6. Listing copy audit + push to Etsy
Restructured copy so the inviting pitch leads and the unpopular terms sit in the fine print.
- `LISTING_COPY.md` (new) — benefits-first; "The details" block at the bottom holds non-refundable /
  3-revisions / 30-day window. Shop Announcement + policy notes included.
- `server/scripts/update-description.js` (rewritten) — per-product intros (Star/Couple/Heart/Home Street)
  + shared body with the 30-day digital terms; loops the 4 real drafts; skips stray `4514770864`.
- **Pushed live** (HTTP 200) to the 4 **draft** listings: `4514771222`, `4515239446`, `4515255432`,
  `4515247537`.

## 7. Deploys done this session
- Frontend: `npm run build` → `rsync --delete --exclude='designs/' dist/ → /var/www/poster-studio/`.
- Server: `rsync server/ → prod` + `systemctl restart poster-studio-api` (active).
- Prod DB setting `digital_edit_window_days=30`.
- Etsy descriptions pushed via `update-description.js`.

## 8. Tests
- Playwright `routing-new` + `user-journeys`: **53/53 pass**.
- `poster-modes` + `map-controls`: pass except **2 flaky "Mode switching" tests** — confirmed environmental
  (MapLibre tiles unreachable in mock env; they pass on isolated re-run). Not a regression.

## 9. Demo order #28
Created to validate confirm-mode; the user clicked through it (it entered the pipeline). **Cancelled**
(`status='cancelled'`, render_queue cleared) so it can't fulfill. Safe to delete entirely later.

---

## Remaining USER actions
1. **Set a Gmail auto-forward rule**: Etsy notification emails → `studio@themappedmoment.com`, so the
   triage webhook receives them. (Code is live but starved without this.)
2. **Add mockup images + publish** the 4 draft listings (currently drafts; 0 active).
3. **Delete the stray draft `4514770864`** (duplicate; intentionally skipped by the description push).

## Verification
- Confirm-mode: `curl https://themappedmoment.com/api/order-status/<token>` →
  `confirmRequired:true` only when `awaiting_size_confirm`; `POST /api/confirm-order` with no awaiting order
  → 404 "No order awaiting confirmation."
- 30-day window: prod `settings.digital_edit_window_days = 30`; revision past 30 days → 403 `editWindowClosed`.
- Triage: `ENABLE_MESSAGE_TRIAGE` (≠0) + `EMAIL_FORWARD_TO` set in server `.env`; inbound to studio@ →
  escalation email with draft.
- Listings: open the 4 drafts in Shop Manager → descriptions show "free edits for a full 30 days" and the
  "PLEASE NOTE" fine print.
- Tests: `npm run build && npx playwright test routing-new.test.ts user-journeys.test.ts`.

## Git state
Changes are **deployed to prod but largely uncommitted** in the local tree (branch
`codex/backup-current-state-20260501`). Notable untracked/modified: `LISTING_COPY.md`,
`server/scripts/update-description.js`, `server/services/messageTriage.js`, `server/routes/verify.js`,
`server/services/{etsy,renderQueue,email}.js`, `server/db.js`, `src/components/SidebarControls.tsx`,
`CLAUDE.md`. **Recommend committing** these with a clear message before further work. Run `git status` to
confirm the full set.

## Related docs
- `CLAUDE.md` — updated Order Flow (30-day window) + Order Confirm Mode section.
- `bridge/CLAUDE-CODE-WSL-MCP.md` (in hermes-local) — the separate Windows computer-control tooling set up
  later this session (unrelated to the shop; parked navmap plan in `~/.claude/plans/parallel-foraging-token.md`).
