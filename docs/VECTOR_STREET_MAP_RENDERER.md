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

## Enable Locally

The vector renderer is disabled by default. Enable it in the browser:

```js
localStorage.setItem('posterStudio.vectorMapRenderer', '1');
location.reload();
```

Disable it:

```js
localStorage.removeItem('posterStudio.vectorMapRenderer');
location.reload();
```

It can also be enabled at build time:

```bash
VITE_VECTOR_MAP_RENDERER=true npm run build
```

## Scope

Current prototype supports:

- `posterType === "streetmap"`
- monochrome `mapColorPreset === "design2"`
- vector roads, water, and selected landuse polygons
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

With the flag enabled, the map layer should contain SVG paths and no map image:

```js
const svg = document.querySelector('#poster-preview svg');
({
  images: svg.querySelectorAll('#map-layer image').length,
  paths: svg.querySelectorAll('#map-layer path').length,
});
```

Expected:

```js
{ images: 0, paths: 5 }
```

## Smoke Results

Local checks after clipping/readiness changes:

- Listing preview, `8x10`: 5 vector map paths, 0 map images, ~702k path chars, ~6.6s to ready.
- Headless `/render`, `8x10`: 5 vector map paths, 0 map images, completed in ~3.5s.
- Headless `/render`, `24x36`: 6 vector map paths, 0 map images, ~1.08M path chars, completed in ~8.5s.

These are smoke tests, not load tests. Before enabling vector mode globally, run concurrent render tests for `24x36` and `A1` on production-sized hardware.
