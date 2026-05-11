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

Current prototype does not support:

- colored map labels and POIs
- text label collision/placement from map tiles
- true vector PDF output; current PDF flow still embeds a raster PNG

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
