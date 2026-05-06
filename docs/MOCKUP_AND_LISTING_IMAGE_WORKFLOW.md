# Mockup And Listing Image Workflow

Use this when generating Etsy listing mockups, placing poster designs into existing empty frames, or planning future listing-image rotation tests.

## Current Compositor

Script:

```bash
npm run mockups:compose
```

Implementation:

```text
scripts/composite-mockups.py
```

What it does:

- Accepts Windows paths pasted from Explorer or normal Linux paths.
- Places a portrait design PNG into known empty frame mockups.
- Uses `multiply` blending for white-background designs so wall/frame lighting remains natural.
- Uses `normal` blending for dark-background designs so dark artwork does not disappear into black frames.
- Uses `contain` fit by default so poster borders are not cropped by slight frame-ratio mismatch.
- Uses `--inset` to keep the design safely inside the physical frame opening.

## White SM001 Mockups

Source folder:

```text
C:\Users\PC\Desktop\Etsy The Mapped Moment\LISTINGS\SM001\listing images\temp
```

Generate improved white mockups:

```bash
npm run mockups:compose -- \
  --design public/designs/SM001/Design001/8x10.png \
  --output-dir "/mnt/c/Users/PC/Desktop/Etsy The Mapped Moment/LISTINGS/SM001/listing images/generated-sm001-design001-v2" \
  --contact-sheet \
  --inset 18
```

Windows output:

```text
C:\Users\PC\Desktop\Etsy The Mapped Moment\LISTINGS\SM001\listing images\generated-sm001-design001-v2
```

## Dark SM001 Mockups

Generate dark Design004 mockups:

```bash
npm run mockups:compose -- \
  --set sm001-dark \
  --design public/designs/SM001/Design004/8x10.png \
  --output-dir "/mnt/c/Users/PC/Desktop/Etsy The Mapped Moment/LISTINGS/SM001/listing images/generated-sm001-design004-dark-v2" \
  --contact-sheet \
  --blend normal \
  --opacity 0.98 \
  --inset 10
```

Windows output:

```text
C:\Users\PC\Desktop\Etsy The Mapped Moment\LISTINGS\SM001\listing images\generated-sm001-design004-dark-v2
```

## Placement Rules

- If the poster border is clipped, increase `--inset` by 4-8 px.
- If the poster looks too small, reduce `--inset` by 4 px.
- Use `--fit contain` for designs where the full poster border must be visible.
- Use `--fit cover` only when the frame opening ratio matches the poster very closely and edge cropping is acceptable.
- Use `--blend multiply` for white-background posters.
- Use `--blend normal` for dark posters.
- If a mockup is off-center, update its `box` in `scripts/composite-mockups.py`.

## Future Skills To Build

### Design Template Idea Skill

Input:

- product type
- target buyer profile
- season/occasion
- current best-selling designs

Output:

- 5-10 design concepts
- default text
- map/star locations
- typography direction
- mockup direction

Use `docs/CUSTOMER_PROFILE_JESSICA.md` as the creative source of truth.

### Mockup Background Generation Skill

Input:

- frame color
- poster background color
- orientation
- listing niche

Output:

- image generation prompt
- suggested props/room styling
- empty frame specs
- recommended aspect ratio and frame opening

For Jessica, keep the aesthetic modern minimalist luxury.

### Mockup Compositing Skill

Input:

- design PNG
- mockup set
- blend mode
- inset

Output:

- final listing images
- contact sheet
- placement QA notes

Use `scripts/composite-mockups.py` as the deterministic implementation.

### Listing Image Rotation Skill

Goal:

- rotate first image/order across Etsy listing variants to learn which mockup converts best.

Track:

- listing ID
- image order
- date range
- views
- favorites
- add-to-carts
- orders
- conversion rate

Implementation idea:

- maintain a CSV or SQLite table of image-order experiments
- generate ordered upload folders per experiment
- avoid changing multiple variables at once
- run at least 7-14 days per order unless traffic is very high
