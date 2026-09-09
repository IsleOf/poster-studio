# Vector Street Map Renderer

Experimental renderer for monochrome street maps.

## Fallback

The current raster MapLibre renderer is preserved at Git tag:

```bash
renderer-raster-maplibre-fallback-2026-05-12
```

To inspect or restore the fallback implementation:

```bash
git show renderer-raster-maplibre-fallback-2026-05-12
git checkout renderer-raster-maplibre-fallback-2026-05-12 -- src/components/VectorStarMap.tsx src/components/StreetMapCapture.tsx src/utils/renderPoster.ts
```

## Runtime Controls

The vector renderer is enabled by default for monochrome street maps:

- `posterType === "streetmap"`
- `mapColorPreset === "design2"`

Force-enable it in a browser:

```js
localStorage.setItem('posterStudio.vectorMapRenderer', '1');
location.reload();
```

Force-disable it for raster comparison:

```js
localStorage.setItem('posterStudio.vectorMapRenderer', '0');
location.reload();
```

Clear the override:

```js
localStorage.removeItem('posterStudio.vectorMapRenderer');
location.reload();
```

It can also be disabled at build time:

```bash
VITE_VECTOR_MAP_RENDERER=false npm run build
```

For the local Puppeteer server renderer only, vector mode can be enabled without changing customer browsers:

```bash
RENDER_VECTOR_MAPS=true ENABLE_LOCAL_RENDER=true npm run api
```

Production order/demo renders should use `RENDER_VECTOR_MAPS=true` once the deployed frontend has the parity renderer. Keep `RENDER_VECTOR_MAPS=false` only when deliberately falling back to the raster MapLibre capture.

## Scope

Current prototype supports:

- `posterType === "streetmap"`
- monochrome `mapColorPreset === "design2"`
- vector roads, water, and selected landuse polygons
- raster-style monochrome road casing: white underlays, gray minor roads, black major roads
- in-browser preview and demo PNG export from vector SVG paths
- headless `/render?token=...` PNG export when the flag is enabled
- map panning in vector mode
- slow vector tile fallback: stalled tile requests are aborted and retried later

Current prototype does not support:

- colored map labels and POIs
- text label collision/placement from map tiles
- true vector PDF output; current PDF flow still embeds a raster PNG

## Export Readiness

Vector maps load asynchronously. Export paths must wait until `#map-layer` contains vector path data before rasterizing the SVG. The current guard checks for:

- no `Search a city to load map` placeholder text
- more than 10k total characters across `#map-layer path[d]`

This guard is used in:

- preview/demo download flow
- headless `/render?token=...` order-render flow

The renderer also clips off-canvas geometry and removes near-duplicate points. This keeps the SVG path payload small enough for Chrome's SVG-to-image decode while preserving visible street detail.

## Test Check

With vector enabled, the map layer should contain SVG paths and no map image:

```js
const svg = document.querySelector('#poster-preview svg');
({
  images: svg.querySelectorAll('#map-layer image').length,
  paths: svg.querySelectorAll('#map-layer path').length,
  pathChars: [...svg.querySelectorAll('#map-layer path')]
    .reduce((n, p) => n + (p.getAttribute('d') || '').length, 0),
});
```

Expected:

```js
{ images: 0, paths: 8, pathChars: 1200000 }
```

## Smoke Results

Local checks after clipping/readiness changes:

- Listing preview, `8x10`: 5 vector map paths, 0 map images, ~702k path chars, ~6.6s to ready.
- Headless `/render`, `8x10`: 5 vector map paths, 0 map images, completed in ~3.5s.
- Headless `/render`, `24x36`: 6 vector map paths, 0 map images, ~1.08M path chars, completed in ~8.5s.

These are smoke tests, not load tests. Before increasing production concurrency, run concurrent render tests for `24x36` and `A1` on production-sized hardware.

## Stress Test Harness

Use the render stress harness to exercise the same `/render?token=...` page that local Puppeteer uses for server-side rendering:

```bash
npm run stress:render -- --base-url http://localhost:5173 --api-url http://localhost:3001 --size 24x36 --runs 4 --concurrency 2 --vector
```

Production-safe small test:

```bash
npm run stress:render -- --base-url https://themappedmoment.com --api-url https://themappedmoment.com --size 24x36 --runs 2 --concurrency 1 --vector
```

The script creates temporary saved-design tokens, opens concurrent render pages, and reports:

- render duration
- approximate PNG size
- vector path count and path character count
- raster map image count
- page errors

Keep production concurrency low until the queue/backpressure behavior is verified. The live order queue still processes one queued render at a time by design.
