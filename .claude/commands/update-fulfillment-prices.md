# /update-fulfillment-prices

Research and update the fulfillment provider pricing database for The Mapped Moment poster shop.

## Goal

Fetch the latest print and shipping costs from each provider, then update the `fulfillment_providers` table in the database via the admin API so the template editor always shows current prices.

## Steps

### 1. Check what's in the database

Run the following to see which providers and sizes are currently tracked and when they were last updated:

```bash
sqlite3 /home/ubuntu/poster-studio/server/data/db.sqlite \
  "SELECT provider, product_type, size, print_cost, ship_cost_us, last_updated, datetime(last_updated,'unixepoch') as updated_date FROM fulfillment_providers ORDER BY provider, product_type, size;"
```

If running locally use: `/home/dev/poster-studio/server/data/db.sqlite`

### 2. Research current prices

For each provider below, fetch their current pricing page and extract print costs and shipping costs. Focus on single-unit prices (we sell one-off custom orders, not bulk).

**Providers to check:**

| Provider | URL | What to look for |
|----------|-----|-----------------|
| ShortRunPosters | https://www.shortrunposters.com/standard.html | Per-size poster prices + shipping calculator |
| Scalable Press | https://scalablepress.com/pricing?type=poster | Poster pricing by size |
| Printful | https://www.printful.com/custom/wall-art/posters/enhanced-matte-paper-poster-in | Poster prices; https://www.printful.com/custom/wall-art/framed-posters/enhanced-matte-paper-framed-poster-in for framed; https://www.printful.com/custom/wall-art/canvas-prints/canvas-in for canvas |
| Printify | https://printify.com/app/products/home-and-living/posters | Check for cheapest provider by size |
| PrintOps | https://printops.com/pricing | Full framed poster price list |
| Prodigi | https://www.prodigi.com/products/wall-art/framed-prints/ | Framed and canvas |
| Gelato | https://www.gelato.com/products/posters-frames | Framed poster prices |
| Printseekers | https://www.printseekers.com/print-on-demand-framed-posters | Starting prices + size range |

**Key product types to update:**
- `poster_unframed` — plain poster print
- `poster_framed` — print inside frame
- `poster_framed_mat` — print with mat board and frame
- `canvas` — stretched canvas

**Key sizes:** `5x7`, `8x10`, `11x14`, `16x20`, `18x24`, `24x36`

### 3. Update the database

Once you have current prices, call the admin API to bulk-update. First get an admin token:

```bash
# Get admin token (replace PASSWORD with actual admin password from server .env)
TOKEN=$(curl -s -X POST https://themappedmoment.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"PASSWORD"}' | jq -r .token)
```

Then PUT the updated rows:

```bash
curl -s -X PUT https://themappedmoment.com/api/admin/fulfillment-providers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {"provider":"printops","product_type":"poster_framed","size":"18x24","print_cost":37.00,"ship_cost_us":5.00,"ship_cost_intl":null,"has_api":true,"notes":"Black frame. Confirmed price.","source_url":"https://printops.com/pricing"},
    ...more rows...
  ]'
```

### 4. Verify the update

```bash
sqlite3 /home/ubuntu/poster-studio/server/data/db.sqlite \
  "SELECT provider, product_type, size, print_cost, ship_cost_us, datetime(last_updated,'unixepoch') FROM fulfillment_providers ORDER BY product_type, (print_cost+ship_cost_us);"
```

### 5. Update the memory file

After updating, also update the memory file at:
`/home/dev/.claude/projects/-home-dev-poster-studio/memory/framing_canvas_costs.md`

Update the pricing tables with the new values and mark the research date at the top.

## Notes

- Prices are estimates from public pages — actual prices may vary slightly when ordering
- Rows marked "Est." in notes column are estimated and should be verified first
- Prices change infrequently (quarterly) — monthly check is sufficient
- If a provider's page requires login to see prices, mark the row with `notes = "Login required — verify manually"` and leave costs as the last known values
- Focus on single-unit pricing (no bulk/volume discounts — we sell custom one-offs)
- US shipping costs are to continental US; international estimates are for global average
