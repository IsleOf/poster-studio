# Poster Studio Agent Runbook

This is the operational handoff for coding agents. Read this before changing listing data, tests, deployment, or local startup behavior.

Last updated: 2026-05-01

## Current Backup

- Git branch: `codex/backup-current-state-20260501`
- Draft PR: `https://github.com/IsleOf/poster-studio/pull/1`
- Backup commit: `9f22485 Back up project continuation state`

## What Runs Where

| Surface | Local dev | Production |
| --- | --- | --- |
| Frontend | Vite on `http://localhost:5173` | Nginx static files at `https://themappedmoment.com` |
| API | Node/Express on `http://localhost:3001` | `poster-studio-api.service` on port `3001`, proxied by Nginx |
| DB | `server/data/db.sqlite` | `/home/ubuntu/poster-studio/server/data/db.sqlite` |
| Static thumbnails | `public/designs/**` served by Vite | `/var/www/poster-studio/designs/**` served by Nginx |

Production health verified on 2026-05-01:

- `https://themappedmoment.com/api/health` returns `{"ok":true,...}`.
- Production has all four public listings:
  - `star-map-night-we-met`: 72 templates, 6 design groups
  - `colored-map-home-street`: 12 templates, 1 design group
  - `colored-map-heart`: 12 templates, 1 design group
  - `street-map-monochrome`: 12 templates, 1 design group
- Production thumbnail assets for the three newer map listings return `200 image/png`.

## Start Local WSL Stack

Use two terminals from `/home/dev/poster-studio`:

```bash
npm run api
npm run dev -- --host 0.0.0.0
```

Expected ports:

```bash
ss -ltnp | rg ':(3001|5173)\b'
curl -fsS http://127.0.0.1:3001/api/health
curl -I http://127.0.0.1:5173/
```

Open `http://localhost:5173/`. Vite proxies `/api` and `/auth` to `http://localhost:3001` through `vite.config.ts`.

Notes:

- `npm run api` is the real backend (`server/index.js`).
- `npm run server` is legacy (`server/save-server.js`) and is not the API used by listings/admin/order verification.
- If the app is stuck at `Loading design...`, check that the API is running and that `/api/templates` responds.

## Listing Source Of Truth

The source of truth for which templates belong to each listing is:

```bash
scripts/sync-listing-state.cjs
```

It enforces:

- `listing_templates` membership and ordering
- `templates.thumbnail_path`
- `settings_json.printSize === fulfillment_size`
- `settings_json.titleAllCaps`

Run locally:

```bash
npm run listings:sync
```

Run on production after deploying any listing/template DB changes:

```bash
ssh ubuntu@3.107.34.169 "cd /home/ubuntu/poster-studio/server && node ../scripts/sync-listing-state.cjs --db data/db.sqlite"
```

Do not hand-edit listing membership in SQLite unless you also update `scripts/sync-listing-state.cjs`.

## Production/Local Parity Checks

Fast API audit:

```bash
npm run listings:audit
npm run listings:audit -- --prod-only
```

Browser visual verification:

```bash
npm run listings:verify
npm run listings:verify -- --prod-only
```

Screenshots are written to `/tmp/verify-*.png`.

Expected result:

- Local may warn if the local API/frontend are not running.
- Production must pass.
- Every listing should expose the expected design groups and template counts.
- Every template should have a `/designs/**` thumbnail path.
- Production thumbnail files should return successfully.

## Test Suite To Continue Work

Run before handing off or pushing:

```bash
npm run build
npm run test:unit
npm run test:continue
npm run listings:audit -- --prod-only
```

Use visual snapshot updates only when the visual changes are intentional:

```bash
npm run test:continue:update
```

Continuation suite docs:

```bash
docs/TEST_SUITE_CONTINUATION.md
```

## Deployment Guardrails

- Do not deploy frontend files over production `designs/` unless intentionally replacing all rendered thumbnails.
- Use rsync excludes for production static deploys, especially `--exclude='designs/'`.
- `server/` is gitignored because it can contain `.env`, SQLite data, uploaded assets, and production-only state. Inspect it locally when needed, but do not add secrets or DB files to git.
- Production API and DB changes must be verified with `npm run listings:audit -- --prod-only` after deploy.

## Agent Handoff Checklist

1. Read `CODEX_HANDOVER.md`, `HANDOVER.md`, and this runbook.
2. Check dirty state with `git status --short --branch`.
3. Start local API and Vite if the task touches browser behavior.
4. Run `npm run listings:sync` before debugging missing/new listing cards.
5. Compare local/prod with `npm run listings:audit`.
6. Use browser-use or Playwright CLI for actual page rendering checks.
7. Run the continuation suite before pushing.
8. Summarize exact commands run, pass/fail status, and any live server sessions left running.
