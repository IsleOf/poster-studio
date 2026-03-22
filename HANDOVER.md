# The Mapped Moment — Agent Handover

**Last Updated:** 2026-03-23
**Live URL:** https://themappedmoment.com
**VPS:** AWS EC2 t3.micro · Ubuntu 24.04 · Sydney (`ap-southeast-2`)
**Public IP:** `13.210.227.152` · Instance: `i-0dfddb55abbf931d1`
**SSH:** `ssh ubuntu@13.210.227.152`

---

## Project Vision

A browser-based print-quality poster designer with three modes:
- **Star Map** — real astronomical SVG (D3 + d3-celestial, no API key needed)
- **Street Map** — 2-color monochrome vector maps via MapLibre + OpenFreeMap
- **Colored Map** — full-color realistic maps (Google Maps-style via OpenFreeMap bright style)

Brand name: **The Mapped Moment** (`themappedmoment.com`).

### Business Model (Etsy + Printify)
Customers arrive from an Etsy shop link (template-specific URL), configure a custom poster in the app, download a free DEMO (watermarked 300 DPI PNG), then purchase via Etsy. After purchase:
- **Digital orders** → backend auto-renders 300 DPI PNG → sends secure download link via Etsy message
- **Print orders** → backend uses pre-rendered PNG → routes to Printify print-on-demand → Printify ships to customer

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite 7 |
| UI | Chakra UI v2 + Tailwind CSS 4 |
| State | Zustand v5 (~80 state fields) |
| Star maps | D3 (d3-geo, d3-selection, d3-scale) + d3-celestial CDN data |
| Street maps | MapLibre GL JS v5 + OpenFreeMap vector tiles |
| Geocoding | Nominatim (free, no API key) |
| Fonts | Bundled WOFF2 via @font-face (offline-capable) |
| Export | SVG → Canvas → 300 DPI PNG (`renderPoster.ts`) |
| Backend | Node.js + Express 5 (`server/`) |
| Database | SQLite via better-sqlite3 |
| Web server | nginx (HTTPS via Let's Encrypt, HTTP/2, gzip) |
| DNS | `themappedmoment.com` → `13.210.227.152` |

---

## Project Structure

```
poster-studio/
├── src/
│   ├── App.tsx                    # Root — BrowserRouter, three routes
│   ├── main.tsx                   # React entry, ChakraProvider
│   ├── index.css                  # Tailwind + global theme
│   ├── components/
│   │   ├── MainLayout.tsx         # Split-pane layout, zoom/pan, poster preview
│   │   ├── VectorStarMap.tsx      # SVG poster renderer (~1000 lines, ALL poster types)
│   │   ├── SidebarControls.tsx    # All sidebar controls (~1800 lines, accordion-based)
│   │   ├── StreetMapCapture.tsx   # Offscreen MapLibre renderer → 2×2 stitched canvas
│   │   ├── GlyphPicker.tsx        # Visual glyph browser for Mapped Moment Script
│   │   ├── CitySearch.tsx         # Nominatim city autocomplete
│   │   ├── DownloadButton.tsx     # SVG → 300 DPI PNG export (DEMO watermark)
│   │   ├── VerifyOrder.tsx        # /verify page — customer enters token to confirm order
│   │   └── PrivacyPolicy.tsx      # /privacy page
│   ├── store/
│   │   └── useStore.ts            # Zustand store (ALL state + setters, ~590 lines)
│   ├── utils/
│   │   ├── astronomy.ts           # Projection rotation from lat/lng/date/time
│   │   ├── geocode.ts             # Nominatim API wrapper
│   │   └── renderPoster.ts        # Shared 300 DPI PNG render utility
│   └── hooks/
│       └── useDebounce.ts         # Debounce hook for heavy renders
├── server/
│   ├── index.js                   # Main Express server (port 3001)
│   ├── db.js                      # SQLite setup + schema
│   ├── routes/
│   │   ├── designs.js             # POST /api/save-design, GET /api/design/:token
│   │   ├── verify.js              # POST /api/verify-order
│   │   └── download.js            # GET /api/download/:token
│   ├── services/
│   │   ├── etsy.js                # Etsy API client + order polling (skeleton)
│   │   └── printify.js            # Printify REST API client (skeleton)
│   ├── nginx.conf                 # Full nginx config
│   └── poster-studio.service      # systemd unit for Node backend
├── public/fonts/                  # Bundled fonts
└── dist/                          # Build output (gitignored)
```

---

## Three Poster Modes

### Star Map (`posterType === 'starmap'`)
- Fetches star/constellation JSON from d3-celestial CDN
- Renders SVG: background → clip shape → stars → constellations → text
- `mapBackgroundImage` is `null` → renders stars

### Street Map (`posterType === 'streetmap'`)
- 2-color monochrome presets (Midnight, Classic, Forest, Ocean, etc.)
- MapLibre renders offscreen → 2×2 stitched capture → data URL
- `mapStyleUrl = null` (custom 2-color style)

### Colored Map (`posterType === 'coloredmap'`)
- Full-color OpenFreeMap "bright" style
- Same capture flow as street map
- `mapStyleUrl = 'https://tiles.openfreemap.org/styles/bright'`
- Location pin (red heart) enabled by default, draggable
- Heritage POI filter strips business labels

---

## VectorStarMap.tsx — Core Poster Renderer

Five `useEffect` blocks:
1. **Data fetch** — loads stars + constellations (once)
2. **SVG layers** — creates background, defs, map, frame, text layers
3. **Map rendering** — stars/constellations OR map image + clip shape + location pin + border
4. **Frame rendering** — optional decorative frame rect
5. **Text rendering** — title, subtitle, divider, details, dedication

### Text Positioning System
Uses a "natural flow" layout with **fixed reference sizes** (80/32/24px scaled by print size ratio). Each element has an independent Y offset. **Resizing one element does NOT push others** — the flow uses reference sizes, not live font sizes.

### Inline Text Editing
Click text → SVG element hidden → HTML `<input>` overlay via `createPortal(…, document.body)`.
- **Local state** during editing (not store-driven) — prevents ghost/double text
- Commits to store via `setCustomText` on blur/Enter
- Escape discards changes (restores SVG element visibility)
- `sizeAdjust` compensation: for Mapped Moment Script, divides measured height by 2.5

### Pending Glyph Mechanism
When GlyphPicker is used while inline edit is active:
1. GlyphPicker sets `pendingGlyphForInlineEdit` in store (instead of `setCustomText`)
2. GlyphPicker buttons use `onMouseDown={e.preventDefault()}` to prevent focus stealing
3. VectorStarMap's useEffect reads cursor position from `inlineEditInputRef`, inserts glyph, restores cursor
4. Works because `pendingGlyphForInlineEdit` is a store field, not direct DOM manipulation

### Location Pin (Red Heart)
- Rendered as a scaled version of the heart mask path, filled `#e74c3c` with white stroke
- Positioned at map center + `locationPinOffsetX/Y`
- **Draggable** via D3 drag behavior
- Default on for colored maps, 70px default size
- Offset resets when city changes

### Mask Shapes
| Shape | Path | Size Default | Notes |
|-------|------|-------------|-------|
| Circle | D3 circle | 1.0 | Standard, no transform scaling |
| Heart | Custom SVG path | 1.0 | heartOrigWidth=122.88, center (61.44, 53.7) |
| House | Custom SVG path | 1.0 | houseOrigHeight=90, center (50, 45) |

---

## Mapped Moment Script Font

Custom script font with PUA glyph alternates. Key details:

- **CSS `size-adjust: 250%`** in `@font-face` — makes it render visually comparable to regular fonts at the same px value. No auto-bumping sizes when switching fonts.
- **SVG rendering:** forces `font-weight: 400` and `letter-spacing: 0` (connecting strokes break with spacing)
- **Inline edit compensation:** divides measured bounding rect height by 2.5 for font-size calculation
- **File:** `MappedMomentScript-400-normal.woff2` (renamed from Sophia-Ronald)

### Glyph Sets
| Set | Unicode Range | Notes |
|-----|--------------|-------|
| Standard | U+0061–007A | Regular a–z |
| Alt 1 | U+F001–F01F | First swash alternates (default tab) |
| Alt 2 | U+F028–F059 | Second alternates |
| Alt 3 | U+F029–F05C | Third alternates |
| Alt 4 | U+F05D–F076 | Fourth alternates |
| Alt 5 | U+F078–F094 | Heart-tail swash alternates |
| Ligatures | U+F021–F026 | tt, th, ss, ts, rr |

### GlyphPicker Component
- Shows automatically when Mapped Moment Script is selected for any text field
- Tab bar: Std, Alt 1 (default), Alt 2–5, Lig
- Preview input: editable, `fontSize="3xl"`, `minH="130px"`, `overflow: visible`
- Glyph buttons: `h="80px"`, `fontSize="2xl"`, with `onMouseDown={preventDefault}` to prevent focus stealing
- Auto-syncs target field with `activeTypoField` (click text in poster → correct tab activates)
- Cursor-aware insertion in both sidebar preview and inline edit overlay

---

## Templates

Five built-in templates:

| ID | Label | Shape | Mode | Key Settings |
|----|-------|-------|------|-------------|
| `classic-dark` | Classic Dark | circle | starmap | Dark navy, Cormorant Garamond, fineline border |
| `modern-white` | Modern White | circle | starmap | White bg, DM Sans, divider enabled |
| `love-dark` | Love Dark | heart | starmap | Dark blue, Playfair Display |
| `home-street` | Home Street | house | coloredmap | White bg, Cinzel, divider, OpenFreeMap bright |
| `default` | (fallback) | circle | starmap | Dark bg, Lato |

Template icon colors: circle/house both use `#CBD5E0` (light gray) for Modern White/Home Street.

---

## Store State Categories (~80 fields)

**Core data:** title, subtitle, date, time, location, lat, lng
**Style:** starScale, lineWeight, gridWidth, glowIntensity, gridOpacity, posterColor, textColor, starColor, mapInteriorColor
**Shape:** maskShape (circle/heart/house), circleSize, heartSize, houseSize, shapeOffsetY, shapeOutlineWidth
**Text (per field):** font, fontSize, kerning, offsetY — for title, subtitle, details, dedication
**Frame/Border:** showFrame, frameInset, frameWidth, showBorder, borderStyle, finelineWidth
**Divider:** showDivider, dividerLength, dividerThickness, dividerOffsetY
**Visibility:** showLocation, showDate, showCoords
**Custom text:** customText.{title, subtitle, date, location, coords, dedication}
**Map:** mapCity, mapCenterLat/Lng, mapZoom, mapBgColor, mapStreetColor, mapColorPreset, mapStyleUrl, mapBackgroundImage, mapImageOffsetX/Y
**Location pin:** showLocationPin, locationPinSize, locationPinOffsetX/Y
**Template:** selectedTemplate, templateSettings, borderStyle
**Preview:** previewZoom, previewPanX/Y, isInlineEditing
**Typography UI:** activeTypoField, pendingGlyphForInlineEdit
**Print:** printSize {label, width, height, ratio} — default 8x10"

### Font Size Slider Ranges
| Field | Min | Max |
|-------|-----|-----|
| Title | 24 | 300 |
| Subtitle | 16 | 200 |
| Details | (resize drag only) | 80 |
| Dedication | 12 | 150 |
| Resize drag (all) | 10 | 400 |

---

## SVG Coordinate System
- Width: always 1200px
- Height: 1500 (8×10/16×20), 1527 (11×14), 1600 (18×24), 1800 (24×36)
- Font scaling: `ratio = svgHeight / 1600` — all font sizes multiply by this

---

## Deployment

```bash
# Build + deploy frontend
npm run build && rsync -avz --delete dist/ ubuntu@13.210.227.152:/var/www/poster-studio/

# Deploy server changes
rsync -avz server/ ubuntu@13.210.227.152:/home/ubuntu/poster-studio/server/
ssh ubuntu@13.210.227.152 "sudo systemctl restart poster-studio-api"
```

### Server Services
| Service | Status | Notes |
|---------|--------|-------|
| nginx | enabled | Serves frontend + proxies /api/ → :3001 |
| poster-studio-api | enabled | Node.js backend on port 3001 |
| certbot.timer | enabled | Auto-renews SSL cert |

---

## Street Map Internals

### 2×2 Tile Stitching
Instead of a single capture at `mapZoom`, captures at `mapZoom + 1` in a 2×2 grid:
- Each tile covers half the linear geographic area
- Together, 4 tiles = same area but one extra zoom level of detail
- Result: 7200×7200px stitched image
- Mercator math computes 4 quadrant centers precisely

### Color Change Strategy
`setPaintProperty` (instant, no tile reload) → `captureQuick()` for immediate preview (~100ms) → debounced `captureStitched()` after 1.2s for full quality.

### Heritage POI Filter (Colored Map)
`applyHeritagePOIFilter()` strips business POIs (shops, restaurants, hotels) while keeping museums, historic sites, churches, viewpoints, galleries.

---

## Known Issues & Technical Debt

| Issue | Priority | Notes |
|-------|----------|-------|
| SidebarControls.tsx is 1800+ lines | MEDIUM | Should be split into sub-components |
| fonts.css has duplicate @font-face | LOW | Needs deduplication (works but wasteful) |
| No URL routing for templates | HIGH | Needed for Etsy listing links |
| No backend dashboard | HIGH | No admin UI for orders/templates |
| setMapImageOffsetX/Y unused in VectorStarMap | LOW | Legacy from refactor |
| Mobile responsiveness | LOW | Desktop-only layout currently |

---

## Next Phase: Seller Platform Backend

See detailed plan below for the backend architecture including:
- Template URLs for Etsy listings
- Seller dashboard (template editor, order management)
- Etsy API + Printify API integrations
- Asset management (fonts, shapes, images)
- Automatic + manual order processing
