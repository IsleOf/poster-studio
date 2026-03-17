# Poster Studio — Claude Code Instructions

## What This Is

A print-quality poster designer combining:
- **Star Map** mode: SVG star charts from real astronomical data (D3 + d3-celestial dataset)
- **Street Map** mode: Custom city street maps via MapLibre GL JS + OpenFreeMap tiles

Design is from the `sm2/final-print-starmap` project (Chakra UI, dark sidebar, split-pane layout).
Street map capability is from `map-poster-platform` (MapLibre, color presets, city geocoding).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 7 |
| UI | Chakra UI v2 + Tailwind CSS 4 |
| State | Zustand v5 |
| Star maps | D3 (d3-geo, d3-selection, d3-scale) + d3-celestial data |
| Street maps | MapLibre GL JS v5 + OpenFreeMap vector tiles |
| Geocoding | Nominatim (free, no API key) |
| Fonts | Fontsource (bundled, offline-capable) |
| Export | SVG serialization → Canvas → PNG (300 DPI) |

## Project Structure

```
poster-studio/
├── src/
│   ├── App.tsx                    # Root — just renders MainLayout
│   ├── main.tsx                   # React entry, ChakraProvider wrapper
│   ├── index.css                  # Tailwind + global theme
│   ├── components/
│   │   ├── MainLayout.tsx         # Split-pane layout, zoom/pan, poster preview
│   │   ├── VectorStarMap.tsx      # SVG poster renderer (star OR street map)
│   │   ├── SidebarControls.tsx    # All controls (1600+ lines, accordion-based)
│   │   ├── StreetMapCapture.tsx   # Offscreen MapLibre renderer → canvas capture
│   │   ├── CitySearch.tsx         # Nominatim city autocomplete
│   │   └── DownloadButton.tsx     # SVG → 300 DPI PNG export
│   ├── store/
│   │   └── useStore.ts            # Zustand store (all state + setters)
│   ├── utils/
│   │   ├── astronomy.ts           # Projection rotation from lat/lng/date/time
│   │   └── geocode.ts             # Nominatim API wrapper
│   └── hooks/
│       └── useDebounce.ts         # Debounce hook for heavy renders
├── public/
│   └── fonts/                     # Bundled fonts for offline use
└── dist/                          # Build output (gitignored)
```

## How The Two Modes Work

### Star Map Mode
`posterType === 'starmap'` in the store.
- `VectorStarMap.tsx` fetches star/constellation JSON from d3-celestial CDN
- Renders SVG layers: background → clip shape → stars → constellations → text
- `mapBackgroundImage` is `null` → renders stars

### Street Map Mode
`posterType === 'streetmap'` in the store.
- `MainLayout.tsx` renders `<StreetMapCapture>` offscreen (fixed, top:-9999px)
- MapLibre GL JS renders the street map to a WebGL canvas
- On `idle`/`moveend`, `StreetMapCapture.onCapture(dataUrl)` is called
- `MainLayout` calls `setMapBackgroundImage(dataUrl)` to store the snapshot
- `VectorStarMap.tsx` detects `mapBackgroundImage !== null` and renders it as an `<image>` inside the poster template (clipped to circle/heart shape)
- All poster text, titles, borders, fonts still apply on top

### Adding a Color Preset
Edit `src/components/StreetMapCapture.tsx`, `MAP_COLOR_PRESETS` array:
```ts
{ id: 'my-theme', name: 'My Theme', bgColor: '#hex', streetColor: '#hex' }
```

### Adding a Font
Edit `src/components/SidebarControls.tsx`, the `TITLE_FONTS` / `SUBTITLE_FONTS` arrays.

## Development

```bash
# From /home/dev/poster-studio/
npm run dev        # Dev server on http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build
```

## Deployment (AWS EC2 VPS)

**Server:** AWS EC2 t3.micro, Ubuntu 24.04, Sydney (`ap-southeast-2`)
**Tailscale IP:** `100.93.10.110`
**SSH:** `ssh ubuntu@100.93.10.110`
**Served on:** Port 80 via nginx, publicly accessible

### Deploy Steps
```bash
# 1. Build locally
npm run build

# 2. Copy to VPS
rsync -avz --delete dist/ ubuntu@100.93.10.110:/var/www/poster-studio/

# 3. (First time only) Set up nginx — see DEPLOYMENT.md
```

### Quick redeploy after changes
```bash
cd /home/dev/poster-studio && npm run build && rsync -avz --delete dist/ ubuntu@100.93.10.110:/var/www/poster-studio/
```

## Key Files for Common Tasks

| Task | File |
|------|------|
| Change layout/split pane | `MainLayout.tsx` |
| Add poster template preset | `SidebarControls.tsx` → Templates section |
| Add map color preset | `StreetMapCapture.tsx` → `MAP_COLOR_PRESETS` |
| Change SVG poster rendering | `VectorStarMap.tsx` → 3 useEffect blocks (background, stars/map, text) |
| Add new store state | `useStore.ts` → add interface field + default + setter |
| Change geocoding | `utils/geocode.ts` |
| Change city search UI | `CitySearch.tsx` |

## Troubleshooting

### Street map shows blank
- The offscreen MapLibre div needs `canvasContextAttributes: { preserveDrawingBuffer: true }` (already set)
- Wait for the `idle` event before calling `toDataURL()`
- Check browser console for tile loading errors

### Star data not loading
- D3-celestial data is fetched from `raw.githubusercontent.com/ofrohn/d3-celestial`
- Check network connectivity; data loads once and is cached in component state

### Build fails
```bash
# Clean rebuild
rm -rf node_modules dist && npm install && npm run build
```
