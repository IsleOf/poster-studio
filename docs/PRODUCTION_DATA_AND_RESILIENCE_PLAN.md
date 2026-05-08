# Production Data And Resilience Plan

Last updated: 2026-05-08

Production is currently the source of truth for templates because most manual template/design edits have been made in the production admin editor. Local development should be refreshed from production before debugging template parity, listing sync, map positioning, or saved design defaults.

## Current Production Snapshot

Pulled to local on 2026-05-08:

- Backup folder: `backups/production-sync/20260508-094756`
- Local DB replaced: `server/data/db.sqlite`
- Local design thumbnails/assets synced: `public/designs/`
- Production DB size: 500 KB
- Synced design assets size: 6.4 MB
- DB counts: 112 templates, 4 listings, 4 designs, 0 orders, empty render queue

Production health checked on 2026-05-08 with `npm run prod:health`:

- Root disk: 29 GB total, 22 GB used, 6.8 GB available, 76% used
- Memory: 911 MiB total, 268 MiB available, 340 MiB swap used
- API service: active for 3+ days, 74.6 MB current memory, 88.2 MB peak memory
- Journal logs: 221 MB
- Large disk consumers are not Poster Studio render output right now:
  - `/home/ubuntu/.local`: 7.9 GB
  - `/home/ubuntu/.cache`: 3.6 GB
  - `/home/ubuntu/.npm-global`: 1.5 GB
  - `/home/ubuntu/.npm`: 581 MB
  - `/home/ubuntu/node_modules`: 537 MB
  - `/home/ubuntu/poster-studio/server/data`: 9.2 MB
  - `/home/ubuntu/poster-studio/outputs`: 4 KB
  - `/var/www/poster-studio/designs`: 6.4 MB

Conclusion: the current production crash risk is mostly the small EC2 memory/disk headroom plus accumulated user-level caches. Render storage is small today, but 300-DPI PNG output can become a disk pressure problem as order volume grows.

## Pull Production State To Local

Run from `/home/dev/poster-studio`:

```bash
npm run prod:pull-state
```

This script:

- Copies the production SQLite DB from `/home/ubuntu/poster-studio/server/data/db.sqlite`.
- Syncs production design assets from `/var/www/poster-studio/designs/`.
- Backs up the previous local DB and `public/designs/` folder under `backups/production-sync/<timestamp>/`.
- Replaces local `server/data/db.sqlite` with the production DB copy.
- Writes the latest backup timestamp to `backups/production-sync/LATEST`.

Environment overrides:

```bash
PROD_HOST=ubuntu@3.107.34.169 \
PROD_DB=/home/ubuntu/poster-studio/server/data/db.sqlite \
PROD_DESIGNS=/var/www/poster-studio/designs/ \
LOCAL_DB=server/data/db.sqlite \
LOCAL_DESIGNS=public/designs/ \
npm run prod:pull-state
```

Do not run local listing/template sync scripts immediately after pulling production unless the intent is to overwrite production-authored template membership/defaults. For template parity work, inspect first, then decide whether code-based sync should be updated to match production.

## Production Health Check

Run:

```bash
npm run prod:health
```

The script is read-only. It prints:

- Host and timestamp.
- Root disk usage.
- Memory and swap usage.
- `poster-studio-api.service` status.
- Journal disk usage.
- Known large app/cache paths.
- Poster Studio DB counts and render queue status.

Use this before and after deployment, after render changes, and whenever production feels slow.

## Why Production Can Crash Under Load

The server is a small EC2 instance with less than 1 GB RAM. It currently runs the API reliably, but the risky paths are:

- Local Puppeteer rendering can need hundreds of MB per active render.
- 300-DPI PNGs can be tens to hundreds of MB each while rendering, serializing, uploading, or serving.
- The current durable render path is local disk through `orders.render_path`.
- Download serving uses `res.sendFile(path.resolve(order.render_path))`, so a full disk or missing local render file directly breaks fulfillment.
- The API currently has no object-storage abstraction, no lifecycle cleanup policy, and no production disk guard before accepting/rendering work.
- If render concurrency increases above 1, memory pressure can spike quickly.
- User-level caches under `/home/ubuntu/.local` and `/home/ubuntu/.cache` already consume more disk than the app itself.

## Immediate Operational Guardrails

Keep these in place until object storage and cleanup are implemented:

- Keep render queue concurrency at 1.
- Keep `ENABLE_LOCAL_RENDER=false` on production unless intentionally testing server-side rendering.
- Prefer external/Lambda rendering over local Puppeteer on the EC2 host.
- Leave at least 5 GB free disk before running large render batches.
- Check `npm run prod:health` before demos, releases, or high-volume test rendering.
- Rotate or clean large non-app caches if root disk exceeds 85%.
- Do not store generated mockups, test screenshots, or temporary render exports in the production repo.

Recommended systemd hardening for `poster-studio-api.service`:

```ini
Restart=always
RestartSec=5
MemoryMax=700M
MemorySwapMax=1500M
LimitNOFILE=4096
```

Recommended journald cap:

```ini
SystemMaxUse=300M
RuntimeMaxUse=100M
```

## Object Storage Recommendation

For production fulfillment, use object storage rather than Google Drive.

Google Drive or Google One can be cheap for human-managed files, but it is not the right production render store: URLs, permissions, quotas, API behavior, lifecycle policies, and service-account ownership are more awkward than purpose-built object storage.

If the choice is only Google Drive vs AWS S3, use S3 for production correctness. If cheaper S3-compatible storage is acceptable, evaluate Cloudflare R2 or Backblaze B2 first.

Storage options to compare before implementation:

- AWS S3: mature, reliable, strong lifecycle and signed URL support, but storage, requests, and transfer are priced separately. Pricing source: https://aws.amazon.com/s3/pricing/
- Cloudflare R2: S3-compatible object storage with no egress fees in the standard model, often cheaper for public/download-heavy files. Pricing source: https://developers.cloudflare.com/r2/pricing/
- Backblaze B2: S3-compatible object storage with low storage pricing and simple lifecycle rules. Pricing source: https://www.backblaze.com/cloud-storage/pricing
- Google Cloud Storage: production-grade object storage if staying in Google infrastructure. Pricing source: https://cloud.google.com/storage/pricing

Practical recommendation:

- Start with Cloudflare R2 if the priority is lowest recurring cost and easy public/download delivery.
- Start with AWS S3 if the priority is lowest integration risk, mature tooling, and future AWS Lambda render pipeline integration.
- Do not use Google Drive for automated render fulfillment unless it is a temporary manual backup process.

## Target Storage Architecture

Add a storage adapter boundary:

```text
server/services/storage/
  index.js
  localStorage.js
  s3Storage.js
```

Interface:

```js
await storage.putObject({ key, body, contentType, metadata });
await storage.getSignedUrl({ key, expiresInSeconds });
await storage.deleteObject({ key });
await storage.headObject({ key });
```

Environment:

```bash
RENDER_STORAGE_PROVIDER=local|s3
RENDER_STORAGE_BUCKET=...
RENDER_STORAGE_REGION=...
RENDER_STORAGE_ENDPOINT=...   # for R2/B2
RENDER_STORAGE_ACCESS_KEY_ID=...
RENDER_STORAGE_SECRET_ACCESS_KEY=...
RENDER_STORAGE_PUBLIC_BASE_URL=...
RENDER_TEMP_DIR=/tmp/poster-studio-renders
```

Suggested object keys:

```text
renders/digital/{orderId}/{token}.png
renders/demo/{sessionId}/{timestamp}.png
renders/mockups/{listingSku}/{imageNumber}.png
```

DB migration:

```sql
ALTER TABLE orders ADD COLUMN render_storage_provider TEXT;
ALTER TABLE orders ADD COLUMN render_storage_key TEXT;
ALTER TABLE orders ADD COLUMN render_storage_bytes INTEGER;
ALTER TABLE orders ADD COLUMN render_storage_sha256 TEXT;
ALTER TABLE orders ADD COLUMN render_expires_at INTEGER;
```

Keep `orders.render_path` temporarily for backward compatibility. New renders should write both the old `render_path` during transition and the new storage metadata after upload. Once downloads use the adapter, local temp files should be deleted after successful upload.

## Render Lifecycle Policy

Recommended retention:

- Demo renders: 24 hours to 7 days.
- Paid digital render files: 180 to 365 days.
- Print-provider handoff files: retain until fulfillment is confirmed plus 30 days.
- Mockup/listing assets: retain indefinitely or until manually replaced.
- Temporary local render files: delete immediately after upload or after 24 hours if a job fails.

Failure behavior:

- If upload fails, keep local temp file and mark render queue failed with a clear `storage_upload_failed` error.
- If local disk free space is below threshold before rendering, do not start the render. Mark the queue item failed or delayed with `disk_space_low`.
- If object storage has the file but DB update fails, retry DB update by checking object `sha256`/size.
- If DB says rendered but object is missing, mark the order failed and require rerender.

## Implementation Plan

1. Add the storage adapter and local provider.
2. Add S3-compatible provider using AWS SDK v3.
3. Add DB columns for storage metadata.
4. Update `renderViaLambda` and `renderViaLocal` to write to temp path, validate, upload to storage, then delete temp path.
5. Update `/api/download-file/:orderId` to issue a signed object-storage URL or proxy through the adapter.
6. Add a cleanup job for expired local temp files and expired object keys.
7. Add disk preflight checks before local render starts.
8. Add production env docs and deployment notes.
9. Run a controlled production test order with a small file first, then A1/24x36 print sizes.

## Test Plan

Unit tests:

- Storage adapter contract for local provider.
- S3 provider with mocked SDK client.
- Object key generation is deterministic and does not expose customer names/addresses.
- Disk threshold helper refuses render work when free space is below configured minimum.
- Expiration/lifecycle helper calculates demo vs paid retention correctly.

Integration tests:

- Queue render writes a temp file, uploads it, stores metadata, deletes temp file.
- Download endpoint returns a valid signed URL or streams the stored object.
- Existing local `render_path` orders still download during migration.
- Failed upload marks queue/order with actionable error text.
- Missing object for rendered order returns a controlled error and does not crash API.

Browser/visual tests:

- Continue Playwright listing visual tests for preview consistency.
- Add one render-route smoke test for each active product type.
- Add one A1/24x36 high-resolution export smoke test that verifies the map image is not blank and meets minimum byte-size thresholds.

Load/fault tests:

- Enqueue multiple render jobs and verify only one render is active.
- Simulate object-storage latency and verify the API remains responsive.
- Simulate disk-low condition by pointing `RENDER_TEMP_DIR` to a small test volume or mocked stat result.
- Restart `poster-studio-api.service` mid-queue and verify pending jobs resume safely.

Production smoke after implementation:

```bash
npm run prod:health
npm run listings:audit -- --prod-only
curl -fsS https://themappedmoment.com/api/health
```

Then run one paid-order verification path with a test token/order and confirm:

- Render queue completes.
- Object exists in storage.
- Local temp file is gone.
- Download link works before expiry.
- `npm run prod:health` still shows stable disk and memory.
