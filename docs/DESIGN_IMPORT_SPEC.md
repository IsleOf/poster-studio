# Design Import Spec — SVG → Poster Studio Design

> Use this document to brief whoever (or whatever agent) is producing SVG design files for import into Poster Studio.
> If the deliverable doesn't follow this spec, the import script will reject it or silently produce a broken design.

---

## What you are delivering

A **single zip archive** containing one new design ready to be imported as a `design_group` in Poster Studio. The result, after I (the import agent) process the zip, must be a new design that:

1. Appears as a card in the listing's Design picker (e.g. "Design007")
2. Has templates for every size in the listing (5x7, 8x10, 11x14, 16x20, 18x24, 24x36, A1–A5, etc.)
3. Same-aspect-ratio sizes have **identical layouts** (8x10 = 16x20 in layout; A1–A5 are all identical to each other)
4. Different-aspect-ratio sizes share **style** (fonts, colors, kerning, toggles) but have **independent layout** (text positions, shape position, etc.)
5. Renders correctly in both the browser preview AND the 300 DPI PNG download (fonts must embed)

---

## Required zip contents

```
my-design.zip
├── design.json              # Required — design metadata + element overrides
├── reference.svg            # Required — visual blueprint for the LARGEST aspect-ratio variant (8x10)
├── reference-5x7.svg        # Optional — only if 5x7 layout differs in placement
├── reference-A4.svg         # Optional — only if A-series layout differs
├── reference.png            # Optional — flat thumbnail at 4:5 aspect, ≥600 px wide
├── fonts/
│   ├── Title00X.woff2       # All custom fonts as .woff2 (NOT .ttf, NOT .otf, NOT .zip)
│   ├── Details00X.woff2
│   └── ...
└── README.md                # Optional — designer notes (not parsed)
```

**Hard rules for zip contents:**

- All fonts MUST be `.woff2` format
- All fonts MUST have creator/copyright/foundry metadata stripped (use `pyftsubset --notdef-glyph --notdef-outline --no-hinting --no-recommended-glyphs --drop-tables+=name,DSIG`, or send raw and I will strip)
- All font filenames MUST follow the registry naming: `<RegisteredName>-<weight>-<style>.woff2` (e.g. `Title003-500-normal.woff2`, `Details002-400-italic.woff2`)
- Font name embedded inside the woff2 (`name` table) MUST match the filename's RegisteredName, NOT the original creator's font name
- SVG file MUST be valid XML, parseable by both browsers and `xmldom` (no broken Adobe Illustrator metadata)
- SVG dimensions MUST match the aspect ratio of the variant (8x10 = 4:5, A4 = 210:297, etc.)
- SVG MUST include a viewBox; do not rely on width/height alone

---

## SVG element naming convention (REQUIRED)

The import script reads `id` and `data-role` attributes on SVG elements to map them to Poster Studio store fields. Every dynamic element you want the customer to be able to edit MUST have one of these markers.

### Text elements

| `data-role` value | Maps to | Default visibility |
|-------------------|---------|--------------------|
| `title` | `customText.title` + `titleFont` + `titleFontSize` + `titleOffsetY` + `titleAllCaps` | Visible |
| `subtitle` | `customText.subtitle` + `subtitleFont` + `subtitleFontSize` + `subtitleOffsetY` | Visible |
| `names` | `customText.names` + `namesFont` + `namesFontSize` + `namesOffsetY` | Hidden by default — set `data-show="true"` to default-on |
| `location` | `location` (auto-populated by city search) + `detailsFont` + `detailsFontSize` | Visible |
| `date` | `date` (auto-populated) + `detailsFont` + `detailsFontSize` | Visible |
| `coords` | Lat/Lng auto-populated + `detailsFont` + `detailsFontSize` | Visible |
| `dedication` | `customText.dedication` + `dedicationFont` + `dedicationFontSize` | Hidden by default |

Example:
```xml
<text data-role="title"
      x="400" y="900"
      font-family="Title002, serif"
      font-size="120"
      fill="#1a1a1a"
      text-anchor="middle">
  The Night We Met
</text>
```

### Map / shape elements

| `data-role` value | Maps to |
|-------------------|---------|
| `map-shape` | The clipped map circle/heart/house/rect — receives the rendered star/street map. The element's `x`, `y`, `width`, `height` set position and size. Use `data-shape="circle\|heart\|house\|rect"` |
| `inner-ring` | A decorative stroke INSIDE the map shape. Sets `showInnerRing=true`, `innerRingWidth` from stroke-width, `innerRingInset` from radius delta |
| `outer-ring` | A decorative stroke OUTSIDE the map shape. Sets `showOuterRing=true`, `outerRingWidth`, `outerRingGap` |
| `frame` | The outer rectangular print border. Sets `showFrame=true`, `frameInset`, `frameWidth` |
| `divider` | A horizontal divider line. Sets `showDivider=true`, `dividerLength` (% of width), `dividerThickness` |
| `vert-sep` | A vertical separator (typically between location and date on the same line). Sets `showVertSep=true`, `vertSepHeight`, `vertSepThickness` |
| `heart-decor` | Small decorative heart below text. Sets `showHeartDecor=true`, `heartDecorOffsetY` |
| `location-pin` | Pin icon overlaying the map. Sets `showLocationPin=true`, `locationPinSize` |

### Decorative / static elements

Anything WITHOUT a `data-role` attribute is treated as **static decoration** — it will render exactly as drawn in the SVG, no customer-editable behavior. Use this for:
- Background rectangles
- Stars/sparkles drawn at specific positions
- Logo marks
- Custom flourishes the customer cannot move

Static decoration is preserved as-is in the rendered poster. The customer cannot toggle, move, or recolor it.

---

## Required `design.json` structure

```jsonc
{
  // Required — used for the design_group id and customer-facing card label
  "name": "Design007",
  "displayName": "Bloom Heart",        // optional — defaults to name
  "listingSlug": "star-map-night-we-met",  // which listing this design joins

  // Required — defines which sizes to generate templates for.
  // The script will generate one template per size.
  "sizes": ["5x7", "8x10", "11x14", "12x16", "16x20", "18x24", "24x36", "A5", "A4", "A3", "A2", "A1"],

  // Required — must match the reference.svg's aspect ratio and the 8x10 baseline
  "baselineSize": "8x10",

  // Required — store field defaults.
  // Anything you set here overrides the global TEMPLATE_FIELD_DEFAULTS for this design.
  "defaults": {
    "posterType": "starmap",
    "posterColor": "#0a1428",
    "textColor": "#f8f4e8",
    "starColor": "#f8f4e8",
    "maskShape": "circle",
    "showFrame": true,
    "frameInset": 40,
    "frameWidth": 5,
    "showInnerRing": true,
    "innerRingWidth": 1.5,
    "innerRingInset": 8,
    "showOuterRing": true,
    "outerRingWidth": 1,
    "outerRingGap": 12,
    "showDivider": true,
    "dividerLength": 70,
    "dividerThickness": 0.5,
    "showVertSep": false,
    "showNames": true,
    "showHeartDecor": true,
    "titleFont": "Title003",
    "subtitleFont": "Details002",
    "detailsFont": "Details002",
    "namesFont": "Title003",
    "titleFontSize": 96,
    "namesFontSize": 64,
    "titleAllCaps": false,
    "circleSize": 1.0,
    "shapeOffsetY": -60,
    "titleOffsetY": 0,
    "subtitleOffsetY": 0,
    "namesOffsetY": 0
    // ... include ANY field from src/utils/applyTemplate.ts:TEMPLATE_FIELDS
    // that should differ from the global default
  },

  // Optional — per-size LAYOUT overrides (NOT style).
  // Use only when a different aspect ratio needs different positioning.
  // Same-aspect-ratio sizes will inherit from baselineSize automatically.
  "sizeOverrides": {
    "5x7":  { "titleFontSize": 72, "namesFontSize": 48, "shapeOffsetY": -45 },
    "A4":   { "titleFontSize": 88, "namesFontSize": 56, "shapeOffsetY": -55 },
    "11x14": { "titleFontSize": 84, "namesFontSize": 56 }
  },

  // Optional — sample text for thumbnail capture (NOT shipped to customer; just
  // for the static thumbnail the listing page shows)
  "sampleText": {
    "title": "The Night We Met",
    "subtitle": "A Moment to Remember",
    "names": "Sarah & Michael",
    "location": "Sydney, Australia",
    "date": "March 26, 2024"
  },

  // Required — list of fonts shipped in fonts/ folder.
  // Each entry registers in src/utils/fontRegistry.ts.
  "fonts": [
    { "name": "Title003", "weight": "500", "style": "normal", "file": "Title003-500-normal.woff2" },
    { "name": "Details002", "weight": "400", "style": "normal", "file": "Details002-400-normal.woff2" },
    { "name": "Details002", "weight": "300", "style": "normal", "file": "Details002-300-normal.woff2" }
  ]
}
```

---

## What the import script will do (so you understand the boundary)

Given a valid zip, the import agent will:

1. **Validate** — parse SVG, verify all `data-role` attributes resolve, verify font filenames match registry convention, verify `design.json` schema, verify aspect ratios
2. **Extract layout values** — read positions/sizes/colors/font references from the SVG and merge with `design.json` defaults
3. **Strip font metadata** — re-process every woff2 to remove name/copyright tables (defensive even if you already did it)
4. **Copy fonts** to `src/assets/fonts/`
5. **Update `src/assets/fonts/fonts.css`** — add `@font-face` declarations
6. **Update `src/utils/fontRegistry.ts`** — add `?url` imports + registry entries
7. **Update `src/components/SidebarControls.tsx`** — add font names to `TITLE_FONTS` / `SUBTITLE_FONTS` / `DETAILS_FONTS` arrays as appropriate
8. **Insert DB rows** — `design_groups`, one `templates` row per size, one `listing_templates` row per template (all on local AND production)
9. **Set `listing_templates.position`** to the next available slot for that listing
10. **Capture thumbnail** — render the design at 8x10 with `sampleText`, save to `public/designs/SM001/Design00N/8x10.png` and rsync to prod
11. **Update `scripts/sync-listing-state.cjs`** — add the new design to the `DESIGNS` array
12. **Increment cache-bust** — bump `?v=N` in SidebarControls.tsx and ListingPage.tsx
13. **Build, deploy, verify** — `npm run build`, rsync, run `verify-listing.cjs`, confirm visual match

---

## What you (the SVG producer) MUST get right

These are the parts that have failed in past sessions and produced broken designs:

### 1. Aspect ratio of `reference.svg` matches `baselineSize`
If `baselineSize: "8x10"`, the SVG must be 4:5 (e.g. 800×1000, 1600×2000). Do not deliver an A4-ratio SVG and claim it's the 8x10 baseline. The aspect ratio determines which sibling sizes inherit the layout.

### 2. Fonts named with the registry convention
- ✅ `Title003-500-normal.woff2`
- ❌ `Quiche-Display Medium.woff2`
- ❌ `quiche.ttf`
- ❌ `font.zip` (do not zip fonts inside the zip)

The Registry name (everything before the first hyphen) MUST also be how the font is referenced in `font-family` attributes inside the SVG.

### 3. SVG `font-family` declarations use the registry name, not the original
- ✅ `font-family="Title003, serif"`
- ❌ `font-family="Quiche Display, serif"`

The runtime renderer looks up font registry entries by the family name in the SVG. If the SVG references "Quiche Display" but you registered it as "Title003", the PNG download will fall back to a system font.

### 4. Customer-editable text uses `data-role`, not just `id`
The element's `id` is preserved but unused. Every dynamic element MUST have a `data-role` attribute matching the table above. Static text without `data-role` will be locked in place forever — fine for decoration, broken if you meant for the customer to type their own text into it.

### 5. Default visibility matches design intent
If your design is supposed to show a vertical separator between location and date, set `"showVertSep": true` in `design.json` defaults. The import script does NOT auto-enable based on SVG presence — it reads JSON.

If you draw a `<line data-role="vert-sep">` in the SVG but leave `showVertSep` unset (or false) in JSON, the line will not appear in the rendered poster. The SVG element only provides position/size; visibility comes from JSON.

### 6. No raster fallbacks for vector elements
Do not embed `<image href="data:image/png;base64,...">` for shapes that should be vector. Map shapes, dividers, rings, frames must all be `<path>`, `<circle>`, `<rect>`, or `<line>` — never `<image>`. The map content gets injected at render time; raster-style references will block that.

### 7. No external font URLs
Do not reference Google Fonts, Adobe Fonts, or any CDN in the SVG. Only the fonts you ship in the `fonts/` folder are guaranteed to render. If you reference `font-family="Inter"` and don't ship Inter, customers will see a fallback.

### 8. Color values consistent with palette
If the design uses a 3-color palette, every color in the SVG must come from that palette. The import script does not auto-quantize colors. If you have 47 slightly-different shades of off-white, the customer will see all 47 in the color picker.

---

## What you (the SVG producer) DO NOT need to do

- ❌ Do not convert to TTF/OTF — woff2 is required
- ❌ Do not pre-render at multiple sizes — the renderer scales the SVG at runtime
- ❌ Do not include the actual customer's text in the SVG — use the placeholder text or the `sampleText` from JSON
- ❌ Do not manually run the import script — that's my job. You just deliver the zip
- ❌ Do not add Etsy listing copy / pricing / shipping — that lives separately in the admin Etsy editor
- ❌ Do not fork or modify any code in `src/` — all dynamic behavior is added by the import script

---

## Validation checklist (before you send the zip)

Run through this before delivering:

- [ ] Zip contains `design.json`, `reference.svg`, `fonts/*.woff2`
- [ ] `design.json` parses as valid JSON
- [ ] Every font listed in `design.json:fonts` exists in `fonts/`
- [ ] Every `font-family` reference inside `reference.svg` is in `design.json:fonts`
- [ ] All dynamic text and shape elements have `data-role` attributes
- [ ] SVG has a `viewBox` and the aspect ratio matches `baselineSize`
- [ ] No external URL references (no Google Fonts, no CDN images)
- [ ] No raster `<image>` tags for shapes that should be vector
- [ ] Font filenames follow `RegisteredName-weight-style.woff2`
- [ ] Font internal name (the woff2 `name` table) matches RegisteredName
- [ ] No creator/copyright/foundry metadata in any font file
- [ ] `defaults.posterColor` and `defaults.textColor` make sense as a 2-color minimum palette

---

## Example minimal valid zip

```
design007-bloom-heart.zip
├── design.json
├── reference.svg
└── fonts/
    └── Title003-500-normal.woff2
```

`design.json`:
```json
{
  "name": "Design007",
  "listingSlug": "star-map-night-we-met",
  "sizes": ["8x10", "16x20", "11x14", "A4"],
  "baselineSize": "8x10",
  "defaults": {
    "posterType": "starmap",
    "posterColor": "#1a1a2e",
    "textColor": "#fff8e7",
    "titleFont": "Title003",
    "titleFontSize": 88,
    "showFrame": true
  },
  "sampleText": {
    "title": "Bloom Heart",
    "subtitle": "Forever",
    "location": "Paris, France",
    "date": "April 2026"
  },
  "fonts": [
    { "name": "Title003", "weight": "500", "style": "normal", "file": "Title003-500-normal.woff2" }
  ]
}
```

`reference.svg` (sketched, not literal):
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <!-- decorative background — no data-role -->
  <rect x="0" y="0" width="800" height="1000" fill="#1a1a2e"/>

  <!-- frame — dynamic -->
  <rect data-role="frame" x="40" y="40" width="720" height="920"
        fill="none" stroke="#fff8e7" stroke-width="5"/>

  <!-- map shape — dynamic, receives star map at render time -->
  <circle data-role="map-shape" data-shape="circle"
          cx="400" cy="440" r="280"
          fill="#0a1428" stroke="#fff8e7" stroke-width="2"/>

  <!-- inner ring -->
  <circle data-role="inner-ring"
          cx="400" cy="440" r="260"
          fill="none" stroke="#fff8e7" stroke-width="1.5"/>

  <!-- title -->
  <text data-role="title" x="400" y="820"
        font-family="Title003, serif" font-size="88"
        fill="#fff8e7" text-anchor="middle">
    Bloom Heart
  </text>

  <!-- divider -->
  <line data-role="divider" x1="280" y1="850" x2="520" y2="850"
        stroke="#fff8e7" stroke-width="0.5"/>

  <!-- location -->
  <text data-role="location" x="320" y="900"
        font-family="Details002, serif" font-size="20"
        fill="#fff8e7" text-anchor="middle">
    PARIS, FRANCE
  </text>

  <!-- vertical separator -->
  <line data-role="vert-sep" x1="400" y1="885" x2="400" y2="915"
        stroke="#fff8e7" stroke-width="0.8"/>

  <!-- date -->
  <text data-role="date" x="480" y="900"
        font-family="Details002, serif" font-size="20"
        fill="#fff8e7" text-anchor="middle">
    APRIL 2026
  </text>
</svg>
```

If you can deliver a zip matching this structure, the import will be a single command.

---

## Open questions to confirm with project owner before delivery

1. **Listing assignment** — does this design belong on an existing listing or a brand new one?
2. **Sizes** — full size matrix (12+ sizes) or starter set (5–6 sizes)?
3. **Default visibility** — names ON by default? Dedication line ON by default? Frame ON?
4. **Color theme** — strict 2-color (current) or full color (allow customer to recolor anything)?
5. **Map mode** — starmap, streetmap, or coloredmap?
6. **Position in listing** — first card, last card, or specific slot?

Without answers to these, the import will use sensible defaults from the design's nearest existing sibling, which may not match your intent.
