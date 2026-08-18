import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore, type MapCaptureOptions } from '../store/useStore';
import { MAP_COLOR_PRESET_DATA } from './mapPresets';
import { calculateMapExportTarget } from '../utils/mapExportSizing';
import { printSizeInches } from '../utils/printSizes';

function createMapStyle(bgColor: string, streetColor: string): maplibregl.StyleSpecification {
    return {
        version: 8,
        sources: {
            openmaptiles: {
                type: 'vector',
                url: 'https://tiles.openfreemap.org/planet',
                attribution: '© OpenFreeMap © OpenStreetMap',
            },
        },
        layers: [
            // Strictly 2-color: background fills everything (land, water, buildings)
            { id: 'background', type: 'background', paint: { 'background-color': bgColor } },
            { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': bgColor } },
            {
                id: 'roads_all', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
                minzoom: 6,
                paint: {
                    'line-color': streetColor,
                    'line-width': [
                        'interpolate', ['exponential', 1.5], ['zoom'],
                        6,  ['match', ['get', 'class'], 'motorway', 1.5, 'trunk', 1.2, 'primary', 1, 0.6],
                        14, ['match', ['get', 'class'],
                            'motorway', 10, 'trunk', 8, 'primary', 7, 'secondary', 6,
                            'tertiary', 5.5, 'minor', 5, 'service', 4, 'residential', 5, 3,
                        ],
                        18, ['match', ['get', 'class'],
                            'motorway', 28, 'trunk', 24, 'primary', 20, 'secondary', 18,
                            'tertiary', 16, 'minor', 14, 'service', 11, 'residential', 14, 9,
                        ],
                    ] as maplibregl.ExpressionSpecification,
                },
            },
        ],
    };
}

// ─── Color presets ─────────────────────────────────────────────────────────────

export type MapColorPreset = {
    id: string;
    name: string;
    bgColor: string;
    streetColor: string;
    /** When set, use this pre-built style URL instead of the 2-color custom style. */
    styleUrl?: string;
    /** When set, use this custom style function instead of createMapStyle(). */
    customStyle?: () => maplibregl.StyleSpecification;
};

type Design2MapColors = {
    bgColor: string;
    waterColor: string;
    landColor: string;
    mainRoadColor: string;
    smallRoadColor: string;
    detailRoadColor: string;
};

// Re-export the base preset data under the original name for backward compatibility
export { MAP_COLOR_PRESET_DATA as MAP_COLOR_PRESETS };

/** Monochrome street-map template: single-stroke road linework and land/water masses, no building footprints. */
function createDesign2Style(colors: Design2MapColors): maplibregl.StyleSpecification {
    const { bgColor, waterColor, landColor, mainRoadColor, smallRoadColor, detailRoadColor } = colors;
    const majorRoadClasses = ['motorway', 'trunk', 'primary', 'secondary'];
    const smallRoadClasses = ['tertiary', 'minor', 'residential', 'unclassified'];
    const detailRoadClasses = ['service'];
    const minorStroke = !smallRoadColor || smallRoadColor === '#1a1a1a' ? '#666666' : smallRoadColor;
    const detailStroke = !detailRoadColor || detailRoadColor === '#2a2a2a' ? '#8a8a8a' : detailRoadColor;

    return {
        version: 8,
        sources: {
            openmaptiles: {
                type: 'vector',
                url: 'https://tiles.openfreemap.org/planet',
                attribution: '© OpenFreeMap © OpenStreetMap',
            },
        },
        layers: [
            { id: 'background', type: 'background', paint: { 'background-color': bgColor } },
            {
                id: 'landuse',
                type: 'fill',
                source: 'openmaptiles',
                'source-layer': 'landuse',
                filter: ['in', ['get', 'class'], ['literal', [
                    'grass', 'park', 'forest', 'recreation_ground', 'meadow',
                    'garden', 'wood', 'nature_reserve', 'cemetery', 'hospital',
                    'school', 'industrial', 'railway',
                ]]] as maplibregl.ExpressionSpecification,
                paint: { 'fill-color': landColor, 'fill-opacity': 0.82 },
            },
            {
                id: 'water',
                type: 'fill',
                source: 'openmaptiles',
                'source-layer': 'water',
                paint: { 'fill-color': waterColor },
            },
            {
                id: 'waterway',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'waterway',
                paint: {
                    'line-color': waterColor,
                    'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 14, 3.5, 18, 7] as maplibregl.ExpressionSpecification,
                },
            },
            {
                id: 'roads_detail_underlay',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                minzoom: 6,
                filter: ['in', ['get', 'class'], ['literal', detailRoadClasses]] as maplibregl.ExpressionSpecification,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': bgColor,
                    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.6, 13, 2.8, 16, 6.2, 18, 9.0] as maplibregl.ExpressionSpecification,
                    'line-opacity': 1,
                },
            },
            {
                id: 'roads_small_underlay',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                minzoom: 6,
                filter: ['in', ['get', 'class'], ['literal', smallRoadClasses]] as maplibregl.ExpressionSpecification,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': bgColor,
                    'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.2, 13, 4.6, 16, 10.0, 18, 14.0] as maplibregl.ExpressionSpecification,
                    'line-opacity': 1,
                },
            },
            {
                id: 'roads_major_underlay',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                minzoom: 5,
                filter: ['in', ['get', 'class'], ['literal', majorRoadClasses]] as maplibregl.ExpressionSpecification,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': bgColor,
                    'line-width': [
                        'interpolate', ['linear'], ['zoom'],
                        7, ['match', ['get', 'class'], 'motorway', 3.8, 'trunk', 3.2, 'primary', 2.8, 2.4],
                        13, ['match', ['get', 'class'], 'motorway', 8.6, 'trunk', 7.8, 'primary', 6.6, 'secondary', 5.6, 4.8],
                        16, ['match', ['get', 'class'], 'motorway', 15.0, 'trunk', 13.5, 'primary', 12.0, 'secondary', 10.4, 9.0],
                        18, ['match', ['get', 'class'], 'motorway', 22.0, 'trunk', 20.0, 'primary', 17.5, 'secondary', 15.0, 12.8],
                    ] as maplibregl.ExpressionSpecification,
                    'line-opacity': 1,
                },
            },
            {
                id: 'roads_detail',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                minzoom: 6,
                filter: ['in', ['get', 'class'], ['literal', detailRoadClasses]] as maplibregl.ExpressionSpecification,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': detailStroke,
                    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.85, 13, 1.35, 16, 3.3, 18, 5.0] as maplibregl.ExpressionSpecification,
                    'line-opacity': 1,
                },
            },
            {
                id: 'roads_small',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                minzoom: 6,
                filter: ['in', ['get', 'class'], ['literal', smallRoadClasses]] as maplibregl.ExpressionSpecification,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': minorStroke,
                    'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.25, 13, 2.35, 16, 5.6, 18, 8.0] as maplibregl.ExpressionSpecification,
                    'line-opacity': 1,
                },
            },
            {
                id: 'roads_major',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                minzoom: 5,
                filter: ['in', ['get', 'class'], ['literal', majorRoadClasses]] as maplibregl.ExpressionSpecification,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': mainRoadColor,
                    'line-width': [
                        'interpolate', ['linear'], ['zoom'],
                        7, ['match', ['get', 'class'], 'motorway', 2.4, 'trunk', 2.0, 'primary', 1.7, 1.2],
                        13, ['match', ['get', 'class'], 'motorway', 6.2, 'trunk', 5.4, 'primary', 4.5, 'secondary', 3.6, 2.8],
                        16, ['match', ['get', 'class'], 'motorway', 11.0, 'trunk', 10.0, 'primary', 8.6, 'secondary', 7.2, 5.8],
                        18, ['match', ['get', 'class'], 'motorway', 16.0, 'trunk', 14.5, 'primary', 12.5, 'secondary', 10.5, 8.5],
                    ] as maplibregl.ExpressionSpecification,
                    'line-opacity': 1,
                },
            },
        ],
    };
}

// Full presets with style factory functions — used internally by StreetMapCapture
const MAP_COLOR_PRESETS_FULL: MapColorPreset[] = [
    ...MAP_COLOR_PRESET_DATA.filter(p => p.id !== 'design2' && p.id !== 'realistic'),
    // ── Rectangle: white bg, black highways, gray minor roads + land use fills ─
    { id: 'design2', name: 'Rectangle (B&W)', bgColor: '#ffffff', streetColor: '#111111' },
    // ── Realistic multicolor (uses OpenFreeMap's pre-built bright style) ──────
    {
        id: 'realistic',
        name: 'Realistic',
        bgColor: '#f8f4f0',
        streetColor: '#fc8',
        styleUrl: 'https://tiles.openfreemap.org/styles/bright',
    },
];

// ─── Mercator helpers for tile-center math ─────────────────────────────────────

/** Mercator y pixel coordinate at the given zoom level for a latitude. */
function mercatorY(lat: number, zoom: number): number {
    const sinLat = Math.sin(lat * Math.PI / 180);
    const scale = 512 * Math.pow(2, zoom);
    return (scale / (2 * Math.PI)) * (Math.PI - Math.log((1 + sinLat) / (1 - sinLat)) / 2);
}

/** Latitude from a Mercator y pixel coordinate at the given zoom level. */
function latFromMercatorY(y: number, zoom: number): number {
    const scale = 512 * Math.pow(2, zoom);
    const n = Math.PI - (2 * Math.PI * y) / scale;
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// ─── Predictive tile prefetcher ───────────────────────────────────────────────

/**
 * After a stitch completes, quietly jump the offscreen map to adjacent zoom
 * levels and pan offsets so MapLibre loads those tiles into its in-memory
 * cache AND the service worker caches them on disk.  Runs entirely in the
 * background; never updates onCapture and never blocks the UI.
 */
function prefetchNearbyTiles(
    map: maplibregl.Map,
    lng: number,
    lat: number,
    currentZoom: number,
): void {
    // Prefetch at zoom-1 (wider view) and zoom+1 (closer view), plus
    // a couple of small pan offsets at the current zoom.
    const targets: Array<{ lng: number; lat: number; zoom: number }> = [
        { lng, lat, zoom: Math.max(1,  currentZoom - 1) },
        { lng, lat, zoom: Math.min(20, currentZoom + 1) },
        { lng: lng + 0.02, lat, zoom: currentZoom },
        { lng: lng - 0.02, lat, zoom: currentZoom },
    ];

    let idx = 0;
    function loadNext() {
        if (idx >= targets.length) {
            // Restore to original position silently
            map.jumpTo({ center: [lng, lat], zoom: currentZoom });
            return;
        }
        const t = targets[idx++];
        map.once('idle', loadNext);
        map.jumpTo({ center: [t.lng, t.lat], zoom: t.zoom });
    }

    // Only start if map is currently idle (don't interrupt a real capture)
    if (map.isMoving() || map.isZooming()) return;
    map.once('idle', loadNext);
    map.jumpTo({ center: [targets[0].lng, targets[0].lat], zoom: targets[0].zoom });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIXEL_RATIO = 3;
const CONTAINER_SIZE = 1200; // CSS px
const TILE_CANVAS_SIZE = CONTAINER_SIZE * PIXEL_RATIO; // 3600px per tile
// Cap on how long the high-res temp map may wait for `idle` (all tiles loaded) before we capture.
// In the editor the area is already cached so `idle` fires in <1s and this cap is never hit; but a
// COLD server /render (Puppeteer, no tile cache) loading a ~4000px map at high zoom needs far longer
// than 8s, or it captures a blank (tiles not yet painted). 30s lets the cold render finish.
const TILE_SETTLE_TIMEOUT_MS = 30000;
// Style load is a separate, earlier milestone than tiles settling. Mutations must be
// applied between the two (see captureOffscreenMap).
const STYLE_LOAD_TIMEOUT_MS = 15000;

function waitForMapFrame(
    map: maplibregl.Map,
    jump: () => void,
    draw: () => void,
    timeoutMs = TILE_SETTLE_TIMEOUT_MS,
): Promise<void> {
    return new Promise(resolve => {
        let settled = false;
        let timer: ReturnType<typeof setTimeout>;

        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            map.off('idle', onIdle);
            draw();
            resolve();
        };

        const onIdle = () => {
            if (settled) return;
            if (map.areTilesLoaded()) {
                finish();
                return;
            }
            map.once('idle', onIdle);
        };

        timer = setTimeout(finish, timeoutMs);
        // Register BEFORE jumpTo so cached tiles cannot make us miss the idle event.
        map.once('idle', onIdle);
        jump();
    });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) { reject(new Error('toBlob failed')); return; }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }, type, quality);
    });
}

// ─── Colored-map POI cleanup ──────────────────────────────────────────────────

/**
 * Removes POI markers that make first-home maps feel like a navigation
 * screenshot instead of a keepsake map. OpenFreeMap Bright stores transit,
 * parking, and business markers in poi layers; roads, road shields, parks,
 * water, and place/street labels remain in their own layers.
 */
function applyColoredMapPOICleanup(map: maplibregl.Map): void {
    const cleanupState = map as maplibregl.Map & { __coloredMapPOICleanupApplied?: boolean };
    // NB: not gated on isStyleLoaded() — a preceding label mutation flips it false transiently.
    if (cleanupState.__coloredMapPOICleanupApplied || !map.getStyle()?.layers?.length) return;

    // Route shield numbers ("122", interstate shields, …) are navigational clutter — not
    // information a couple wants on a wedding/anniversary poster. Hide alongside POIs.
    const SHIELD_LAYER_IDS = new Set(['highway-shield-non-us', 'highway-shield-us-interstate', 'road_shield_us']);
    for (const layer of map.getStyle().layers ?? []) {
        const isPOI = layer.id === 'poi_transit' || (layer as { 'source-layer'?: string })['source-layer'] === 'poi';
        if ((isPOI || SHIELD_LAYER_IDS.has(layer.id)) && map.getLayer(layer.id)) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
    }

    cleanupState.__coloredMapPOICleanupApplied = true;
}

// ── Colour saturation for the prebuilt (colored) style ─────────────────────────
// OpenFreeMap's "bright" style is deliberately desaturated so it can sit UNDER app UI.
// As a poster it reads washed out — measured on a real 8x10 export, 91% of the map area
// was brighter than 225/255 with only 2% true ink. This lifts saturation (and nudges very
// light fills slightly darker) so the printed piece has some colour in it.
//
// Only plain string colours are touched. MapLibre paint values are frequently data-driven
// expressions (['interpolate', …], ['match', …]); rewriting those generically is how you
// corrupt a style, so they are skipped rather than guessed at.
const COLORED_MAP_SATURATION = 1.45; // 1 = untouched
const COLORED_MAP_DARKEN_LIGHT = 0.04; // shave a little off near-white fills

function hexToRgb(c: string): [number, number, number] | null {
    const m = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
        let h = m[1];
        if (h.length === 3) h = h.split('').map(x => x + x).join('');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const rgb = c.trim().match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

/** Boost saturation of a plain colour string; returns null if it isn't one we can safely parse. */
function saturateColor(input: unknown, sat: number, darkenLight: number): string | null {
    if (typeof input !== 'string') return null;
    const rgb = hexToRgb(input);
    if (!rgb) return null;
    let [r, g, b] = rgb.map(v => v / 255) as [number, number, number];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0; const l = (max + min) / 2;
    let s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    const s2 = Math.min(1, s * sat);
    const l2 = Math.max(0, l > 0.88 ? l - darkenLight : l);
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    if (s2 === 0) { r = g = b = l2; }
    else {
        const q = l2 < 0.5 ? l2 * (1 + s2) : l2 + s2 - l2 * s2;
        const p = 2 * l2 - q;
        r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
    }
    const to255 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
    return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
}

function applyColoredMapSaturation(map: maplibregl.Map, sat = COLORED_MAP_SATURATION): void {
    if (sat === 1 || !map.getStyle()?.layers?.length) return;
    const st = map as maplibregl.Map & { __coloredMapSaturationApplied?: boolean };
    if (st.__coloredMapSaturationApplied) return;

    const PROPS: Record<string, string[]> = {
        background: ['background-color'],
        fill: ['fill-color', 'fill-outline-color'],
        line: ['line-color'],
        'fill-extrusion': ['fill-extrusion-color'],
    };
    for (const layer of map.getStyle().layers ?? []) {
        const props = PROPS[layer.type];
        if (!props || !map.getLayer(layer.id)) continue;
        for (const prop of props) {
            try {
                const cur = map.getPaintProperty(layer.id, prop);
                const next = saturateColor(cur, sat, COLORED_MAP_DARKEN_LIGHT);
                if (next) map.setPaintProperty(layer.id, prop, next);
            } catch { /* expression-valued or unsupported — leave it alone */ }
        }
    }
    st.__coloredMapSaturationApplied = true;
}

// ── Print-legible road widths ───────────────────────────────────────────────────
// Same root cause as street labels: the "bright" style's line-width interpolate stops are
// tuned for a backlit screen, so roads print as near-invisible hairlines (this is what the
// customer's "cannot see the streets" complaint was actually about, alongside the label size).
// Boost every road line layer's width using the same interpolate-safe scaler as labels.
const COLORED_MAP_ROAD_WIDTH_BOOST = 1.8; // 1 = untouched

function applyColoredMapRoadWidth(map: maplibregl.Map, boost = COLORED_MAP_ROAD_WIDTH_BOOST): void {
    // Same hard-cutoff precaution as labels (see physicalLabelBoost): this was never cleanly
    // isolated as innocent of the NYC hang (an earlier bisection attempt had a variable-name
    // bug — captureOffscreenMap uses `tempMap`, the neutralization pattern searched for `map`
    // — so it silently tested nothing here). Skip below the same zoom floor rather than trust
    // an unproven assumption on a reliability-critical path.
    if (map.getZoom() <= ZOOM_ADAPTIVE_MIN_BOOST_ZOOM) return;
    if (boost === 1 || !map.getStyle()?.layers?.length) return;
    const st = map as maplibregl.Map & { __coloredMapRoadWidthApplied?: boolean };
    if (st.__coloredMapRoadWidthApplied) return;
    for (const layer of map.getStyle().layers ?? []) {
        if (layer.type !== 'line' || (layer as { 'source-layer'?: string })['source-layer'] !== 'transportation') continue;
        if (!map.getLayer(layer.id)) continue;
        try {
            const cur = map.getPaintProperty(layer.id, 'line-width');
            if (cur === undefined || cur === null) continue;
            map.setPaintProperty(layer.id, 'line-width', scaleTextSizeValue(cur, boost) as never);
        } catch { /* layer without line-width — ignore */ }
    }
    st.__coloredMapRoadWidthApplied = true;
}

/**
 * Scale label text size on the prebuilt (colored) style. Captures each symbol layer's
 * base text-size once, then sets text-size = base × scale. Because labels are vector
 * text re-rendered at full print resolution, larger labels stay crisp at 300 DPI.
 */
// ── Print-legible street labels ────────────────────────────────────────────────
// The prebuilt (colored) style is authored for SCREENS: street labels are ~10px, which is
// fine backlit but collapses on paper. Measured on a real delivered 8x10 @300 DPI with
// scale = 1, the street names came out at a 0.34 mm glyph height — **1.0 pt**. For reference
// 5 pt is fine-print/disclaimer size and 6 pt is the practical legibility floor, so buyers
// were getting roughly a quarter of the smallest readable type. That produced a real refund
// case ("cannot see the map streets at all") — the streets were drawn correctly; only their
// NAMES were unreadable.
//
// Label size on paper scales linearly with (a) this multiplier and (b) how many print pixels
// the map image occupies (`rawTargetPx` from calculateMapExportTarget), because the captured
// map is stretched into that area. Calibrated against the 8x10 measurement above
// (rawTargetPx = 2880 → 1.0 pt per unit of scale), the multiplier needed to land on a target
// point size is:
//
//     boost = TARGET_PT × 2880 / rawTargetPx
//
// which self-corrects across formats: small prints (few map pixels) get a bigger boost, large
// prints get less, and every size lands at the same physical type size.
// Street-label size is DERIVED, not guessed: it must render smaller than the poster's own
// personalization text (title/date/location beneath the map) — labels must stay visually
// subordinate, never compete for attention. Computed by:
//   1. Evaluating the reference layer's ACTUAL native text-size at the zoom this capture uses
//      (MapLibre zoom-interpolate expressions are non-linear — you cannot assume a flat
//      "1pt per unit scale" ratio across print sizes, that produced inconsistent results).
//   2. Converting both that native size AND the store's `detailsFontSize` (the location/date
//      line) into the SAME unit — physical points on the finished print — using the exact
//      DPI/scale math the exporter itself uses.
//   3. Deriving the multiplier that lands the label at a target FRACTION of the details text's
//      physical size.
const LABEL_TO_DETAILS_FRACTION = 0.65; // street labels top out at 65% of the details-text size
// ⚠️ Keep this LOW. A dense, wide-zoom view (a whole city — NYC at zoom ~12 covers most of
// Manhattan) has orders of magnitude more candidate labels than a tight small-town view. Every
// boosted label's collision box gets tested against every other candidate, so the boost value
// isn't just a font-size knob — it's a multiplier on MapLibre's placement workload. At boost=10
// a real NYC heart design (zoom 11.9) never completed: 180s render timeout, GPU pegged the whole
// time (verified — not stuck, genuinely too much collision work to finish). A small, tightly
// zoomed town (the original bug report) does not hit this because there are far fewer candidates
// to begin with. Capping here bounds the worst case for every design, not just the ones tested.
const MAX_LABEL_BOOST = 10;
const MIN_LABEL_BOOST = 0.3;

/** Evaluate a MapLibre text-size value (number | interpolate | step) at a given zoom. */
function evaluateSizeAtZoom(value: unknown, zoom: number): number {
    if (typeof value === 'number') return value;
    if (!Array.isArray(value) || typeof value[0] !== 'string') return 12; // unknown shape — safe fallback
    const op = value[0];
    if (op === 'interpolate' || op === 'interpolate-hcl' || op === 'interpolate-lab') {
        // ['interpolate', interpolation, ['zoom'], z0, v0, z1, v1, ...]
        const stops: [number, number][] = [];
        for (let i = 3; i < value.length; i += 2) stops.push([value[i] as number, evaluateSizeAtZoom(value[i + 1], zoom)]);
        if (stops.length === 0) return 12;
        if (zoom <= stops[0][0]) return stops[0][1];
        if (zoom >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
        for (let i = 0; i < stops.length - 1; i++) {
            const [z0, v0] = stops[i], [z1, v1] = stops[i + 1];
            if (zoom >= z0 && zoom <= z1) {
                const t = z1 === z0 ? 0 : (zoom - z0) / (z1 - z0);
                return v0 + (v1 - v0) * t; // linear is a safe approximation for exponential bases here
            }
        }
        return stops[stops.length - 1][1];
    }
    if (op === 'step') {
        const stops: [number, number][] = [];
        let base = evaluateSizeAtZoom(value[2], zoom);
        for (let i = 3; i < value.length; i += 2) stops.push([value[i] as number, evaluateSizeAtZoom(value[i + 1], zoom)]);
        for (const [z, v] of stops) { if (zoom >= z) base = v; else break; }
        return base;
    }
    return 12; // match/case/other — safe fallback rather than mis-scaling
}

/**
 * Physical-point-anchored label boost.
 *   nativeSizePx     — the reference layer's own text-size at THIS capture's zoom (raw pixels).
 *   captureToPrintPx — ratio of final print pixels to raw MapLibre canvas pixels for this
 *                      capture (1 unless the canvas is being downscaled — see call sites).
 *   detailsFontSizeSvgUnits / printSizeWidthIn — used to compute the target's physical pt.
 */
// ⚠️ Zoom-adaptive damping — load-bearing, do not remove.
//
// A real NYC heart design (zoom ~11.9, covers most of Manhattan) hung the render pipeline at
// the full boost target — not because of wait-timing (tried a fully bounded 4s post-mutation
// settle wait, it STILL hung), but because MapLibre's own symbol collision/placement pass for
// "significantly enlarge every visible label's text-size" is itself an expensive computation
// that scales with the number of visible candidate labels, and a whole-city wide-zoom view has
// orders of magnitude more of those than a tight single-neighborhood view. No JS-level timeout
// can bound that: if the computation runs long enough to feel synchronous, a setTimeout queued
// against it doesn't fire until it yields.
//
// The actual fix has to reduce the WORK, not the wait. Damp the boost target itself as zoom
// drops below a "tight neighborhood" threshold, so wide/dense views ask MapLibre for a much
// smaller (cheaper) enlargement instead of the full print-legible target. Full target at
// zoom>=16 (a real customer report, Worcester at 17.77, confirms this works and stays fast).
// Heavily damped at zoom<=12 (NYC at 11.9 — confirmed fast once damped). Linear between.
const ZOOM_ADAPTIVE_FULL_BOOST_ZOOM = 16;
const ZOOM_ADAPTIVE_MIN_BOOST_ZOOM = 12;
const ZOOM_ADAPTIVE_MIN_FRACTION = 0.12; // at/below the min zoom, target only 20% of the full boost's fraction

function zoomDampingFactor(zoom: number): number {
    if (zoom >= ZOOM_ADAPTIVE_FULL_BOOST_ZOOM) return 1;
    if (zoom <= ZOOM_ADAPTIVE_MIN_BOOST_ZOOM) return ZOOM_ADAPTIVE_MIN_FRACTION;
    const t = (zoom - ZOOM_ADAPTIVE_MIN_BOOST_ZOOM) / (ZOOM_ADAPTIVE_FULL_BOOST_ZOOM - ZOOM_ADAPTIVE_MIN_BOOST_ZOOM);
    return ZOOM_ADAPTIVE_MIN_FRACTION + (1 - ZOOM_ADAPTIVE_MIN_FRACTION) * t;
}

function physicalLabelBoost(opts: {
    nativeSizePx: number;
    captureToPrintPx: number;
    detailsFontSizeSvgUnits: number;
    printSizeWidthIn: number;
    zoom: number;
}): number {
    const { nativeSizePx, captureToPrintPx, detailsFontSizeSvgUnits, printSizeWidthIn, zoom } = opts;
    if (nativeSizePx <= 0 || printSizeWidthIn <= 0) return 1;
    // ⚠️ HARD CUTOFF, not just damping. A partially-damped boost still asks MapLibre to
    // setLayoutProperty a DIFFERENT value than native, which still triggers SOME relayout —
    // and that alone was enough to intermittently hang on NYC even at fraction=0.12 (observed:
    // one run 167s/pass, a later run 182s/fail, same code, same design — the underlying
    // relayout cost is not deterministic enough to trust a "small" boost as safe). Below the
    // damping floor, return a TRUE no-op (1 = unchanged) so wide/dense views get EXACTLY the
    // original, proven-reliable (50s, verified via git-HEAD baseline test) MapLibre behavior —
    // zero label enhancement, zero extra relayout risk. This is a real trade-off, not a full
    // fix: city-wide designs keep their original small labels until label placement is owned
    // outright instead of mutated through MapLibre's collision system.
    if (zoom <= ZOOM_ADAPTIVE_MIN_BOOST_ZOOM) return 1;
    const SVG_WIDTH = 1200, DPI = 300;
    const outputScale = Math.round(printSizeWidthIn * DPI) / SVG_WIDTH;
    const detailsPhysicalPt = (detailsFontSizeSvgUnits * outputScale / DPI) * 72;
    const targetLabelPt = detailsPhysicalPt * LABEL_TO_DETAILS_FRACTION * zoomDampingFactor(zoom);
    const nativePhysicalPt = (nativeSizePx * captureToPrintPx / DPI) * 72;
    if (nativePhysicalPt <= 0) return 1;
    return Math.min(MAX_LABEL_BOOST, Math.max(MIN_LABEL_BOOST, targetLabelPt / nativePhysicalPt));
}

/** Reference layer used to anchor sizing — the actual street-name layer, not a POI/shield. */
const LABEL_REFERENCE_LAYER_ID = 'highway-name-minor';

function effectiveLabelScale(
    map: maplibregl.Map,
    mapLabelScale: number,
    zoomForCapture: number,
    captureToPrintPx: number,
): number {
    let native = 14; // sane fallback if the style ever drops this layer
    try {
        const raw = map.getLayoutProperty(LABEL_REFERENCE_LAYER_ID, 'text-size');
        native = evaluateSizeAtZoom(raw, zoomForCapture);
    } catch { /* keep fallback */ }
    const s = useStore.getState();
    const boost = physicalLabelBoost({
        nativeSizePx: native,
        captureToPrintPx,
        detailsFontSizeSvgUnits: s.detailsFontSize || 24,
        printSizeWidthIn: s.printSize?.width || 8,
        zoom: zoomForCapture,
    });
    // User's slider still multiplies on top, so "bigger/smaller labels" keeps working.
    return (mapLabelScale || 1) * boost;
}

/**
 * How many print pixels the map image will occupy at 300 DPI for the CURRENT design.
 * Read straight from the store so every capture path (offscreen export, stitched preview,
 * live label-scale effect) sizes labels off the same number the exporter uses.
 */
function currentRawTargetPx(): number | undefined {
    try {
        const s = useStore.getState();
        if (!s.printSize) return undefined;
        return calculateMapExportTarget({
            printSize: { ...s.printSize, ...printSizeInches(s.printSize) },
            dpi: 300,
            maskShape: s.maskShape,
            circleSize: s.circleSize,
            heartSize: s.heartSize,
            houseSize: s.houseSize,
        }).rawTargetPx;
    } catch {
        return undefined; // never let label sizing break a capture
    }
}

/** Same as currentRawTargetPx() but the CLAMPED value actually used by the exporter as targetPx. */
function currentTargetPx(): number | undefined {
    try {
        const s = useStore.getState();
        if (!s.printSize) return undefined;
        return calculateMapExportTarget({
            printSize: { ...s.printSize, ...printSizeInches(s.printSize) },
            dpi: 300,
            maskShape: s.maskShape,
            circleSize: s.circleSize,
            heartSize: s.heartSize,
            houseSize: s.houseSize,
        }).targetPx;
    } catch {
        return undefined;
    }
}

/**
 * Multiply a MapLibre `text-size` value by `scale`.
 *
 * ⚠️ You cannot simply wrap the value: `['*', expr, scale]` is INVALID when `expr` is a
 * zoom-driven expression, because the spec requires zoom expressions to be the OUTERMOST
 * function. MapLibre rejects the assignment and silently keeps the old size.
 *
 * That is precisely how street names escaped every previous attempt to enlarge them: in the
 * OpenFreeMap "bright" style the POI/shield/place layers use a plain number for `text-size`
 * (so wrapping worked and those labels DID grow), while `highway-name-minor` / `-major` /
 * `-path` — the actual STREET NAMES — use `['interpolate', …, ['zoom'], …]` and were left
 * untouched. A customer's 8x10 therefore printed street names at ~1 pt.
 *
 * So: recurse into interpolate/step and scale their OUTPUT STOPS, leaving the zoom driver
 * outermost. Only fall back to `['*', …]` for plain numbers and non-zoom expressions.
 */
// Generic: works for any numeric MapLibre paint/layout value, not just text-size — used
// below for BOTH text-size and line-width. See the comment above the function body for why
// naive ['*', expr, scale] wrapping is wrong for zoom expressions.
function scaleTextSizeValue(value: unknown, scale: number): unknown {
    if (scale === 1 || value === undefined || value === null) return value;
    if (typeof value === 'number') return value * scale;

    if (Array.isArray(value) && typeof value[0] === 'string') {
        const op = value[0];
        if (op === 'interpolate' || op === 'interpolate-hcl' || op === 'interpolate-lab') {
            // ['interpolate', interpolation, input, stop1, out1, stop2, out2, ...]
            const out = value.slice(0, 3);
            for (let i = 3; i < value.length; i += 2) {
                out.push(value[i]);                                   // stop (input) — untouched
                out.push(scaleTextSizeValue(value[i + 1], scale));    // output — scaled
            }
            return out;
        }
        if (op === 'step') {
            // ['step', input, default, stop1, out1, stop2, out2, ...]
            const out: unknown[] = [value[0], value[1], scaleTextSizeValue(value[2], scale)];
            for (let i = 3; i < value.length; i += 2) {
                out.push(value[i]);
                out.push(scaleTextSizeValue(value[i + 1], scale));
            }
            return out;
        }
        if (op === 'match') {
            // ['match', input, label1, out1, ..., fallback]
            const out: unknown[] = [value[0], value[1]];
            for (let i = 2; i < value.length - 1; i += 2) {
                out.push(value[i]);
                out.push(scaleTextSizeValue(value[i + 1], scale));
            }
            out.push(scaleTextSizeValue(value[value.length - 1], scale));
            return out;
        }
        if (op === 'case') {
            const out: unknown[] = [value[0]];
            for (let i = 1; i < value.length - 1; i += 2) {
                out.push(value[i]);
                out.push(scaleTextSizeValue(value[i + 1], scale));
            }
            out.push(scaleTextSizeValue(value[value.length - 1], scale));
            return out;
        }
        if (op === 'literal') return value;
        // Non-zoom expression (e.g. ['get', …]) — safe to wrap.
        return ['*', value, scale];
    }
    return value;
}

function applyColoredMapLabelScale(map: maplibregl.Map, scale: number): void {
    // ⚠️ Do NOT re-add `if (!map.isStyleLoaded()) return;`. Any preceding mutation
    // (POI cleanup, saturation) flips isStyleLoaded() false while MapLibre re-validates,
    // so this bailed out and street labels were never scaled. getStyle()/getLayer() guard.
    if (!map.getStyle()?.layers?.length) return;
    const state = map as maplibregl.Map & { __labelBaseSizes?: Record<string, unknown>; __lastLabelScale?: number };
    // ⚠️ IDEMPOTENCY GUARD — do not remove. This function is called from PERSISTENT
    // `.on('idle', …)` listeners (not one-shot), because re-applying on every idle is what
    // makes the mutation survive style/tile reloads. But `setLayoutProperty('text-size', …)`
    // makes MapLibre re-run symbol collision/placement, which can itself fire another `idle`
    // event once it settles — call this unconditionally on every idle and you get a
    // self-sustaining loop: idle → set text-size → relayout → idle → set text-size → … that
    // never lets the page reach a stable state. (This is exactly what hung the export
    // pipeline the first time labels were wired into those listeners — `data-render-ready`
    // never fires because the map never truly goes idle.) Skipping when the scale hasn't
    // actually changed breaks the cycle while still tracking live changes to the slider.
    if (state.__lastLabelScale === scale) return;
    state.__lastLabelScale = scale;
    if (!state.__labelBaseSizes) state.__labelBaseSizes = {};
    const base = state.__labelBaseSizes;
    for (const layer of map.getStyle().layers ?? []) {
        if (layer.type !== 'symbol') continue;
        const hasText = (layer as { layout?: { 'text-field'?: unknown } }).layout?.['text-field'];
        if (!hasText || !map.getLayer(layer.id)) continue;
        // ⚠️ SCOPED to street-name layers only — do not widen this to "every symbol layer"
        // again. Place/water-body names ('label_*', 'water_name_*' — "MANHATTAN ISLAND",
        // "RANDALLS AND WARDS ISLANDS", "Pot Cove") are styled natively LARGER and bolder than
        // street names in this style, on purpose (they label areas, not lines). Applying the
        // SAME multiplier calculated for street-name legibility made them disproportionately
        // huge — a real customer complaint: "some labels are too big and too dark, drawing too
        // much attention from heart pin". Street names still need the boost (that was the
        // original bug); everything else stays at its native, designed size.
        if (!layer.id.startsWith('highway-name')) continue;
        if (!(layer.id in base)) {
            const cur = map.getLayoutProperty(layer.id, 'text-size');
            // ⚠️ getLayoutProperty returns **null** (not undefined) when a layer leaves
            // text-size at its default — which is most layers in the OpenFreeMap "bright"
            // style. The old `cur === undefined` check let null through, so the multiply
            // became ['*', null, scale]; MapLibre rejected it ("Expected value to be of
            // type number, but found null instead") and silently kept the original size.
            // Net effect: label scaling NEVER worked on colored maps, which is how a
            // customer ended up with 1.0 pt street names on an 8x10 print. Treat null and
            // undefined alike, and fall back to the spec default text-size of 16.
            base[layer.id] = (cur === undefined || cur === null) ? 16 : cur;
        }
        const baseSize = base[layer.id];
        if (baseSize === undefined || baseSize === null) continue;
        try {
            map.setLayoutProperty(layer.id, 'text-size', scaleTextSizeValue(baseSize, scale) as never);
        } catch { /* layer without text-size — ignore */ }
    }
}

/**
 * Reserve a collision box at the heart-pin location so the colored style's street/place
 * labels avoid the pin. Uses an invisible (opacity 0) icon symbol with `icon-allow-overlap:
 * true` (always placed) + `icon-ignore-placement: false` (other labels collide with it).
 */
// ── Mask-edge label keepout ──────────────────────────────────────────────────────
// The captured raster is deliberately 3x oversized versus the visible mask shape (see
// `imageSvgSize = mapRadius * 3` in mapExportSizing.ts / VectorStarMap.tsx — done so users can
// drag/reposition the map within the shape). MapLibre lays out labels across that WHOLE square
// raster with no idea a non-rectangular mask will crop most of it away, so a label can be placed
// happily mid-word right where the heart/circle/house boundary later slices it off in the poster
// SVG. That is what produced "Plantation" cut to "Planta" and "Arthur Street" cut to "Arthur S" —
// not a font-size bug, a MASK-AWARENESS bug.
//
// Fix: reuse the exact mechanism this file already uses to keep labels off the location pin
// (applyPinLabelDeclutter) — an invisible, always-placed symbol layer that OTHER labels' own
// collision detection avoids. Tile a grid of those invisible markers across the region OUTSIDE
// a safety-margin-shrunk copy of the mask shape. Any label whose collision box would land in
// that region gets dropped by MapLibre itself, before capture — same engine, same trick, just a
// shaped keepout region instead of a single point.
//
// The maths below are scale-invariant: mapRadius cancels out completely, because both the heart's
// bounding box (2·mapRadius) and the captured square (3·mapRadius) scale with the same mapRadius.
// So this needs no knowledge of print size, zoom, or DPI — only the mask shape.

const HEART_PATH_D = "M60.83,17.19C68.84,8.84,74.45,1.62,86.79,0.21c23.17-2.66,44.48,21.06,32.78,44.41 c-3.33,6.65-10.11,14.56-17.61,22.32c-8.23,8.52-17.34,16.87-23.72,23.2l-17.4,17.26L46.46,93.56C29.16,76.9,0.95,55.93,0.02,29.95 C-0.63,11.75,13.73,0.09,30.25,0.3C45.01,0.5,51.22,7.84,60.83,17.19L60.83,17.19L60.83,17.19z";
const HEART_ORIG_WIDTH = 122.88;
const HEART_ORIG_CX = 61.44;
const HEART_ORIG_CY = 53.7;
// ⚠️ Keep this path DATA in sync with `userHeartPath` in VectorStarMap.tsx — it is the same
// shape, duplicated here because this module has no shared geometry import from that component.
const HOUSE_PATH_D = "M 20 90 L 20 40 L 10 40 L 50 0 L 60 10 L 60 2 L 70 2 L 70 20 L 90 40 L 80 40 L 80 90 Z";
const HOUSE_ORIG_HEIGHT = 90;
const HOUSE_ORIG_CX = 50;
const HOUSE_ORIG_CY = 45;

type Pt = [number, number];

/** Flatten an SVG path (M / L / C / Z only — sufficient for the heart & house masks) into points. */
function flattenSvgPath(d: string, curveSteps = 24): Pt[] {
    const tokens = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
    const pts: Pt[] = [];
    let i = 0, cur: Pt = [0, 0], start: Pt = [0, 0];
    const num = () => parseFloat(tokens[i++]);
    while (i < tokens.length) {
        const cmd = tokens[i++];
        if (cmd === 'M' || cmd === 'L') {
            cur = [num(), num()];
            pts.push(cur);
            if (cmd === 'M') start = cur;
        } else if (cmd === 'C') {
            const p1: Pt = [num(), num()], p2: Pt = [num(), num()], p3: Pt = [num(), num()];
            for (let t = 1; t <= curveSteps; t++) {
                const u = t / curveSteps;
                const mt = 1 - u;
                const x = mt * mt * mt * cur[0] + 3 * mt * mt * u * p1[0] + 3 * mt * u * u * p2[0] + u * u * u * p3[0];
                const y = mt * mt * mt * cur[1] + 3 * mt * mt * u * p1[1] + 3 * mt * u * u * p2[1] + u * u * u * p3[1];
                pts.push([x, y]);
            }
            cur = p3;
        } else if (cmd === 'Z' || cmd === 'z') {
            cur = start;
        }
    }
    return pts;
}

/** Point-in-polygon via ray casting. */
function pointInPolygon([px, py]: Pt, poly: Pt[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Normalized (0..1, origin top-left) safe-zone polygon for a mask shape, within the captured
 * square. Derived once — pure geometry, no render state involved.
 */
const maskSafeZoneCache = new Map<string, Pt[]>();
function maskSafeZonePolygon(maskShape: 'circle' | 'heart' | 'house' | 'rect', insetScale = 0.97): Pt[] | null {
    if (maskShape === 'rect') return null; // rectangle mask: no re-entrant edges, lower risk — out of scope here
    const cacheKey = `${maskShape}:${insetScale}`;
    const cached = maskSafeZoneCache.get(cacheKey);
    if (cached) return cached;

    let poly: Pt[];
    if (maskShape === 'circle') {
        // Circle radius = mapRadius; captured square half-width = 1.5·mapRadius → normalized radius = 1/3.
        const r = (1 / 3) * insetScale;
        poly = Array.from({ length: 64 }, (_, k) => {
            const a = (k / 64) * Math.PI * 2;
            return [0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)] as Pt;
        });
    } else {
        const [pathD, origW, cx, cy] = maskShape === 'heart'
            ? [HEART_PATH_D, HEART_ORIG_WIDTH, HEART_ORIG_CX, HEART_ORIG_CY]
            : [HOUSE_PATH_D, HOUSE_ORIG_HEIGHT, HOUSE_ORIG_CX, HOUSE_ORIG_CY];
        // Same cancellation as getHeartTransform()/getHouseTransform() in VectorStarMap.tsx:
        // scale s = mapRadius·2/origW; captured square = mapRadius·3 → normalized factor = 2/(3·origW).
        const k = 2 / (3 * origW);
        poly = flattenSvgPath(pathD).map(([x, y]) => [0.5 + (x - cx) * k, 0.5 + (y - cy) * k] as Pt);
        // Inset toward the shape's own center (0.5, 0.5) — identical technique to the existing
        // getHeartTransform(insetScale) calls elsewhere in this codebase (search MAP_EDGE_ZONE).
        poly = poly.map(([x, y]) => [0.5 + (x - 0.5) * insetScale, 0.5 + (y - 0.5) * insetScale] as Pt);
    }
    maskSafeZoneCache.set(cacheKey, poly);
    return poly;
}

function applyMaskEdgeLabelKeepout(
    map: maplibregl.Map,
    opts: { maskShape: 'circle' | 'heart' | 'house' | 'rect'; enabled: boolean },
): void {
    const SRC = '__mask_keepout';
    const LYR = '__mask_keepout';
    const IMG = '__mask_keepout_img';

    if (!opts.enabled) {
        if (map.getLayer(LYR)) map.removeLayer(LYR);
        if (map.getSource(SRC)) map.removeSource(SRC);
        return;
    }
    const poly = maskSafeZonePolygon(opts.maskShape);
    if (!poly) return; // rect — no keepout needed

    // Read the container's actual CSS pixel size at call time rather than threading a size
    // variable through from each capture path — this is the SAME coordinate space
    // map.unproject() expects (CSS pixels, not raw canvas-buffer pixels which may differ
    // under pixelRatio), so it is correct regardless of how any given temp map was built.
    const container = map.getContainer();
    const cssSizePx = container.clientWidth || parseFloat(container.style.width) || 0;
    if (!cssSizePx) return; // container not yet laid out — skip rather than divide by zero

    if (!map.hasImage(IMG)) {
        const px = 16;
        map.addImage(IMG, { width: px, height: px, data: new Uint8Array(px * px * 4) }); // transparent
    }

    // Grid the captured square; keep only points OUTSIDE the safe-zone polygon. Grid spacing
    // (not point size) is what determines coverage density here, since icon-size stays constant.
    const GRID = 28;
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    for (let gx = 0; gx <= GRID; gx++) {
        for (let gy = 0; gy <= GRID; gy++) {
            const fx = gx / GRID, fy = gy / GRID;
            if (pointInPolygon([fx, fy], poly)) continue; // inside the safe zone — leave clear
            const px = fx * cssSizePx, py = fy * cssSizePx;
            const lngLat = map.unproject([px, py]);
            features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] }, properties: {} });
        }
    }
    const geo: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };

    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(geo);
    else map.addSource(SRC, { type: 'geojson', data: geo });

    // icon-size sized so adjacent grid points' collision boxes overlap into a continuous barrier
    // (grid pitch in px ≈ cssSizePx/GRID; a 16px source icon needs iconSize ≈ pitch/16 · overlapFactor).
    const pitchPx = cssSizePx / GRID;
    const iconSize = Math.max(0.4, (pitchPx / 16) * 1.15);
    if (!map.getLayer(LYR)) {
        map.addLayer({
            id: LYR, type: 'symbol', source: SRC,
            layout: {
                'icon-image': IMG,
                'icon-size': iconSize,
                'icon-allow-overlap': true,
                'icon-ignore-placement': false,
                'symbol-sort-key': -1, // placed even before the pin — reserves the whole keepout band first
            },
            paint: { 'icon-opacity': 0 },
        });
    } else {
        map.setLayoutProperty(LYR, 'icon-size', iconSize);
    }
}

function applyPinLabelDeclutter(
    map: maplibregl.Map,
    opts: { lng: number; lat: number; sizePx: number; enabled: boolean },
): void {
    if (!map.isStyleLoaded()) return;
    const SRC = '__pin_collision';
    const LYR = '__pin_collision';
    const IMG = '__pin_collision_img';

    if (!opts.enabled) {
        if (map.getLayer(LYR)) map.removeLayer(LYR);
        if (map.getSource(SRC)) map.removeSource(SRC);
        return;
    }

    if (!map.hasImage(IMG)) {
        const px = 16;
        map.addImage(IMG, { width: px, height: px, data: new Uint8Array(px * px * 4) }); // transparent
    }
    const geo = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [opts.lng, opts.lat] }, properties: {} }],
    } as GeoJSON.FeatureCollection;
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(geo);
    else map.addSource(SRC, { type: 'geojson', data: geo });

    const iconSize = Math.max(0.5, opts.sizePx / 16);
    if (!map.getLayer(LYR)) {
        map.addLayer({
            id: LYR, type: 'symbol', source: SRC,
            layout: {
                'icon-image': IMG,
                'icon-size': iconSize,
                'icon-allow-overlap': true,     // the (invisible) marker is always placed…
                'icon-ignore-placement': false, // …and other labels collide with / avoid it
                'symbol-sort-key': 0,           // placed first → reserves its box before labels
            },
            paint: { 'icon-opacity': 0 },
        });
    } else {
        map.setLayoutProperty(LYR, 'icon-size', iconSize);
    }
}

function waitForNextMapRender(map: maplibregl.Map, timeoutMs = 500): Promise<void> {
    return new Promise(resolve => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            map.off('render', finish);
            resolve();
        };
        const timer = setTimeout(finish, timeoutMs);
        map.once('render', finish);
        map.triggerRepaint();
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface StreetMapCaptureProps {
    /** Called with a data-URL of the rendered map canvas */
    onCapture: (dataUrl: string) => void;
}

const StreetMapCapture: React.FC<StreetMapCaptureProps> = ({ onCapture }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const isCapturingRef = useRef(false);
    const pendingCaptureRef = useRef(false);
    const suppressNextMoveendRef = useRef(false);
    // Incremented whenever the desired map position (coords/zoom) changes.
    // captureStitched snapshots this at start and discards the result if it
    // changed mid-stitch, preventing stale captures from overwriting newer ones.
    const captureVersionRef = useRef(0);
    const colorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stitchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const labelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didSkipInitialStyleEffectRef = useRef(false);

    const {
        mapCenterLat, mapCenterLng, mapZoom, mapBearing,
        mapBgColor, mapStreetColor, mapWaterColor, mapLandColor,
        mapMainRoadColor, mapSmallRoadColor, mapDetailRoadColor,
        printSize, maskShape, circleSize, heartSize, houseSize,
        mapStyleUrl, mapColorPreset, mapLabelScale, setCaptureHighResFn,
        showLocationPin, locationPinSize,
    } = useStore();
    const activePreset = MAP_COLOR_PRESETS_FULL.find(p => p.id === mapColorPreset);
    const getActiveStyle = () => {
        if (mapColorPreset === 'design2') {
            return createDesign2Style({
                bgColor: mapBgColor || '#ffffff',
                waterColor: mapWaterColor || '#8f8f8f',
                landColor: mapLandColor || '#b6b6b6',
                mainRoadColor: mapMainRoadColor || mapStreetColor || '#111111',
                smallRoadColor: mapSmallRoadColor || '#1a1a1a',
                detailRoadColor: mapDetailRoadColor || '#2a2a2a',
            });
        }
        return activePreset?.customStyle ? activePreset.customStyle() : createMapStyle(mapBgColor, mapStreetColor);
    };

    const getPrintDetailTarget = () => calculateMapExportTarget({
        printSize: { ...printSize, ...printSizeInches(printSize) },
        dpi: 300,
        maskShape,
        circleSize,
        heartSize,
        houseSize,
    });

    const captureOffscreenMap = async ({
        lng,
        lat,
        zoom,
        bearing,
        targetPx,
        detailScale,
    }: {
        lng: number;
        lat: number;
        zoom: number;
        bearing: number;
        targetPx: number;
        detailScale: number;
    }): Promise<string> => {
        // Render the offscreen WebGL viewport at or above the requested export
        // pixels. Relying on MapLibre's pixelRatio here is fragile across
        // browsers/headless Chromium; if it is ignored, the map canvas is
        // silently upscaled and large 24x36/A1 exports look pixelated while SVG
        // text/pins remain sharp.
        const renderPx = Math.max(targetPx, Math.round(CONTAINER_SIZE * detailScale));
        const effectiveZoom = Math.min(zoom + Math.log2(renderPx / CONTAINER_SIZE), 20);
        // Increase virtual viewport and zoom together. This preserves geographic
        // bounds while asking vector tiles for the denser street network.
        const cssSize = renderPx;
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-100000px';
        tempContainer.style.top = '0';
        tempContainer.style.width = `${cssSize}px`;
        tempContainer.style.height = `${cssSize}px`;
        tempContainer.style.pointerEvents = 'none';
        document.body.appendChild(tempContainer);

        let tempMap: maplibregl.Map | null = null;
        try {
            tempMap = new maplibregl.Map({
                container: tempContainer,
                style: mapStyleUrl ?? getActiveStyle(),
                center: [lng, lat],
                zoom: effectiveZoom,
                bearing: bearing ?? 0,
                pixelRatio: 1,
                canvasContextAttributes: { preserveDrawingBuffer: true },
                interactive: false,
                attributionControl: false,
            });

            // ⚠️ Do not reintroduce a separate up-front "wait for style" phase here. That fixed
            // the original correctness bug (see below) but broke every dense/wide-zoom map — a
            // real NYC heart design at zoom 11.9 went from a 50s render to a 180s hang. Splitting
            // style-wait from tile-wait as two SEPARATE listener registrations interacts badly
            // with MapLibre's own 'idle' scheduling once there are enough tiles/features in
            // flight (a small town has few; most of Manhattan has orders of magnitude more).
            //
            // Back to ONE 'idle' wait (matches git HEAD's proven-fast structure for dense maps),
            // with a short BOUNDED poll afterward for the true original bug: on the offscreen
            // export map, 'idle' can resolve via its timeout race before the style finishes
            // loading, so `if (mapStyleUrl && tempMap.isStyleLoaded())` evaluated false and every
            // mutation silently no-op'd (customer got 1.0 pt street names; three builds produced
            // byte-identical PNGs because none of this code ever ran). A few hundred ms of
            // polling closes that race without paying the two-phase-wait's cost on dense tiles.
            await new Promise<void>((resolve) => {
                let done = false;
                const finish = () => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    tempMap?.off('idle', finish);
                    resolve();
                };
                const timer = setTimeout(finish, TILE_SETTLE_TIMEOUT_MS);
                tempMap!.once('idle', finish);
            });

            if (mapStyleUrl && !tempMap.isStyleLoaded()) {
                for (let i = 0; i < 20 && !tempMap.isStyleLoaded(); i++) {
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            if (mapStyleUrl && tempMap.isStyleLoaded()) {
                // Labels FIRST — the paint mutations below transiently invalidate the style.
                applyColoredMapLabelScale(tempMap, effectiveLabelScale(tempMap, useStore.getState().mapLabelScale, tempMap.getZoom(), targetPx / renderPx));
                applyColoredMapPOICleanup(tempMap);
                applyColoredMapSaturation(tempMap);
                applyColoredMapRoadWidth(tempMap);
                applyPinLabelDeclutter(tempMap, { lng, lat, sizePx: useStore.getState().locationPinSize * 1.4, enabled: useStore.getState().showLocationPin });
                applyMaskEdgeLabelKeepout(tempMap, { maskShape: useStore.getState().maskShape, enabled: false });
                await waitForNextMapRender(tempMap);

                // Enlarging text-size changes symbol collision, which can make MapLibre re-fetch
                // tiles and re-run placement — a single 500ms render-frame wait isn't always
                // enough for that to finish, so the capture below can show labels at their PRE-
                // mutation (small, native) size even though the style itself was updated
                // correctly (confirmed via diagnostic: computedScale was right, output wasn't).
                // The ORIGINAL fix for this waited a full 'idle' with a 30s ceiling — safe for a
                // small town, but that is what caused the NYC hang once combined with the other
                // waits already in this function. Bounded short here on purpose: long enough for
                // a typical relayout, capped low enough it can never reproduce that hang.
                const POST_MUTATION_SETTLE_MS = 4000;
                await new Promise<void>((resolve) => {
                    let done = false;
                    const finish = () => {
                        if (done) return;
                        done = true;
                        clearTimeout(timer);
                        tempMap?.off('idle', finish);
                        resolve();
                    };
                    const timer = setTimeout(finish, POST_MUTATION_SETTLE_MS);
                    tempMap!.once('idle', finish);
                });
            }

            const sourceCanvas = tempMap.getCanvas();
            if (sourceCanvas.width === targetPx && sourceCanvas.height === targetPx) {
                return canvasToDataUrl(sourceCanvas, 'image/png');
            }

            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = targetPx;
            captureCanvas.height = targetPx;
            const ctx = captureCanvas.getContext('2d')!;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(sourceCanvas, 0, 0, targetPx, targetPx);
            return canvasToDataUrl(captureCanvas, 'image/png');
        } finally {
            tempMap?.remove();
            tempContainer.remove();
        }
    };

    // Always-current snapshot of the map position — read inside async captureStitched
    const storeRef = useRef({ mapCenterLat, mapCenterLng, mapZoom, mapBearing });
    useEffect(() => {
        storeRef.current = { mapCenterLat, mapCenterLng, mapZoom, mapBearing };
    });

    /**
     * Captures one full high-pixel-ratio MapLibre canvas. Previous versions
     * stitched multiple map viewports together for extra detail, but separate
     * renders can disagree at quadrant boundaries and create visible seams.
     */
    const captureStitched = useCallback(async () => {
        const map = mapRef.current;
        if (!map) return;

        if (isCapturingRef.current) {
            pendingCaptureRef.current = true;
            return;
        }

        isCapturingRef.current = true;
        pendingCaptureRef.current = false;
        // Signal the UI to show the "Updating map…" overlay while this capture runs.
        useStore.getState().setStreetMapRendering(true);
        // Snapshot the current version — if it changes before we finish, the result is stale
        const startVersion = captureVersionRef.current;
        // Non-null cast: we already returned above if map was null.
        const m = map as maplibregl.Map;

        const { mapCenterLat: lat, mapCenterLng: lng, mapZoom: zoom, mapBearing: bearing } = storeRef.current;
        // Cap at 20 — slider max; above 20 MapLibre scales up rather than loading
        // finer tiles, causing identical-tile artefacts and useless stitching.
        const effectiveZoom = Math.min(zoom, 20);

        try {
            const printDetailTarget = getPrintDetailTarget();
            if (printDetailTarget.detailScale > 1.05) {
                const dataUrl = await captureOffscreenMap({
                    lng,
                    lat,
                    zoom,
                    bearing: bearing ?? 0,
                    targetPx: TILE_CANVAS_SIZE,
                    detailScale: printDetailTarget.detailScale,
                });

                if (captureVersionRef.current !== startVersion) return;
                if (!useStore.getState().isDraggingMapImage) {
                    onCapture(dataUrl);
                }
                return;
            }

            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = TILE_CANVAS_SIZE;
            captureCanvas.height = TILE_CANVAS_SIZE;
            const ctx = captureCanvas.getContext('2d')!;

            if (mapStyleUrl && m.isStyleLoaded()) {
                applyColoredMapPOICleanup(m);
                applyColoredMapSaturation(m);
                applyColoredMapLabelScale(m, effectiveLabelScale(m, useStore.getState().mapLabelScale, m.getZoom(), (currentTargetPx() || TILE_CANVAS_SIZE) / TILE_CANVAS_SIZE));
                applyPinLabelDeclutter(m, { lng, lat, sizePx: useStore.getState().locationPinSize * 1.4, enabled: useStore.getState().showLocationPin });
                applyMaskEdgeLabelKeepout(m, { maskShape: useStore.getState().maskShape, enabled: false }); // disabled — see comment above applyMaskEdgeLabelKeepout: grid-based collision keepout over-suppressed legitimate interior labels in testing, needs rework before re-enabling
                await waitForNextMapRender(m);
            }

            await waitForMapFrame(
                m,
                () => m.jumpTo({ center: [lng, lat], zoom: effectiveZoom, bearing: bearing ?? 0 }),
                () => ctx.drawImage(m.getCanvas(), 0, 0, TILE_CANVAS_SIZE, TILE_CANVAS_SIZE),
            );

            // Restore to the CURRENT store position (user may have changed it mid-capture).
            // This avoids a visible snap-back to the pre-capture position.
            const { mapCenterLat: latNow, mapCenterLng: lngNow, mapZoom: zoomNow, mapBearing: bearingNow } = storeRef.current;
            suppressNextMoveendRef.current = true;
            m.jumpTo({ center: [lngNow, latNow], zoom: Math.min(zoomNow, 20), bearing: bearingNow ?? 0 });

            // Discard stale result — position changed while we were stitching
            if (captureVersionRef.current !== startVersion) return;

            const dataUrl = await canvasToDataUrl(captureCanvas, 'image/png');
            // Don't push the new image while the user is mid-drag — it would interrupt
            // their drag gesture by causing the SVG effect to re-run and reset the offset.
            // After drag ends, the coordinate useEffect fires map.jumpTo() which triggers
            // another captureStitched, so the image will update shortly after.
            if (!useStore.getState().isDraggingMapImage) {
                onCapture(dataUrl);
            }
        } catch (error) {
            console.error('Failed to capture stitched map preview', error);
        } finally {
            isCapturingRef.current = false;
            if (pendingCaptureRef.current) {
                pendingCaptureRef.current = false;
                captureStitched(); // re-sets the rendering flag immediately
            } else {
                useStore.getState().setStreetMapRendering(false);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        onCapture, printSize, maskShape, circleSize, heartSize, houseSize,
        mapStyleUrl, mapColorPreset, mapBgColor, mapStreetColor, mapWaterColor,
        mapLandColor, mapMainRoadColor, mapSmallRoadColor, mapDetailRoadColor,
    ]);

    // ── Initialize map once ────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const initialStyleUrl = useStore.getState().mapStyleUrl;
        const initialState = useStore.getState();
        const initialPresetId = initialState.mapColorPreset;
        const initialPreset = MAP_COLOR_PRESETS_FULL.find(p => p.id === initialPresetId);
        const initialStyle = initialStyleUrl ?? (initialPresetId === 'design2'
            ? createDesign2Style({
                bgColor: initialState.mapBgColor || '#ffffff',
                waterColor: initialState.mapWaterColor || '#8f8f8f',
                landColor: initialState.mapLandColor || '#b6b6b6',
                mainRoadColor: initialState.mapMainRoadColor || initialState.mapStreetColor || '#111111',
                smallRoadColor: initialState.mapSmallRoadColor || '#1a1a1a',
                detailRoadColor: initialState.mapDetailRoadColor || '#2a2a2a',
            })
            : (initialPreset?.customStyle ? initialPreset.customStyle() : createMapStyle(initialState.mapBgColor, initialState.mapStreetColor)));

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: initialStyle,
            center: [mapCenterLng, mapCenterLat],
            zoom: Math.min(mapZoom, 20),
            pixelRatio: PIXEL_RATIO,
            canvasContextAttributes: { preserveDrawingBuffer: true },
            interactive: true,
            attributionControl: false,
        });

        mapRef.current = map;

        const applyInitialColoredCleanup = () => {
            // ⚠️ Label scale deliberately NOT applied here. This runs from persistent
            // `.on('idle'/'styledata', …)` listeners, which fire repeatedly for the life of the
            // map — unlike POI cleanup / saturation / road-width, which are all genuinely
            // idempotent (each has its own "applied once" boolean and no-ops after the first
            // call), `applyColoredMapLabelScale` calls `setLayoutProperty('text-size', …)`,
            // which makes MapLibre re-run symbol collision/placement. That can itself trigger
            // another `idle` event once it settles, which re-enters this same listener, which
            // sets text-size again, forever. First attempt at fixing this used a "skip if scale
            // unchanged" guard, but the computed scale is a float derived from `map.getZoom()`
            // and drifted enough between ticks that the guard never actually matched — the
            // render pipeline OOM-crashed (Puppeteer "Target closed") ~10-20s in before this was
            // caught. Label scale is instead applied exactly once, in the one-shot
            // runInitialCapture() below (guarded by didInitialCapture, not value comparison).
            if (initialStyleUrl && map.isStyleLoaded()) {
                applyColoredMapPOICleanup(map);
                applyColoredMapSaturation(map);
                applyColoredMapRoadWidth(map);
            }
        };
        map.on('styledata', applyInitialColoredCleanup);
        map.on('idle', applyInitialColoredCleanup);

        let didInitialCapture = false;
        const runInitialCapture = () => {
            if (didInitialCapture) return;
            didInitialCapture = true;
            clearTimeout(initialCaptureTimer);
            map.off('load', runInitialCapture);
            map.off('idle', runInitialCapture);
            if (initialStyleUrl && map.isStyleLoaded()) {
                applyColoredMapLabelScale(map, effectiveLabelScale(map, useStore.getState().mapLabelScale, map.getZoom(), (currentTargetPx() || TILE_CANVAS_SIZE) / TILE_CANVAS_SIZE));
                applyColoredMapPOICleanup(map);
                applyColoredMapSaturation(map);
                applyColoredMapRoadWidth(map);
            }
            captureStitched();
        };
        const initialCaptureTimer = setTimeout(runInitialCapture, TILE_SETTLE_TIMEOUT_MS);

        map.once('load', runInitialCapture);
        map.once('idle', runInitialCapture);

        map.on('moveend', () => {
            if (suppressNextMoveendRef.current) {
                suppressNextMoveendRef.current = false;
                return;
            }
            if (isCapturingRef.current) return;
            // Only publish the stitched capture so the preview never regresses
            // to the temporary low-resolution single-tile image.
            if (stitchDebounceRef.current) clearTimeout(stitchDebounceRef.current);
            stitchDebounceRef.current = setTimeout(() => captureStitched(), 250);
        });

        return () => {
            clearTimeout(initialCaptureTimer);
            map.off('load', runInitialCapture);
            map.off('idle', runInitialCapture);
            map.off('styledata', applyInitialColoredCleanup);
            map.off('idle', applyInitialColoredCleanup);
            map.remove();
            mapRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Switch between prebuilt style URL and custom 2-color style ────────────
    // Fires when the user picks the "Realistic" preset (sets mapStyleUrl) or
    // switches back to any 2-color preset (sets mapStyleUrl to null).
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (!didSkipInitialStyleEffectRef.current) {
            didSkipInitialStyleEffectRef.current = true;
            return;
        }

        const newStyle = mapStyleUrl ?? getActiveStyle();
        (map as maplibregl.Map & { __coloredMapPOICleanupApplied?: boolean }).__coloredMapPOICleanupApplied = false;
        map.setStyle(newStyle);
        const applyStyleCleanup = () => {
            // ⚠️ Label scale deliberately NOT applied here. This fires from persistent
            // `.on('idle'/'styledata', …)` listeners (not one-shot) — see the identical note
            // on applyInitialColoredCleanup below for why that caused an infinite idle→relayout
            // loop that OOM-crashed the render (Puppeteer "Target closed" after ~10-20s). Label
            // scale is applied once in the one-shot runStyleCapture() below instead.
            if (mapStyleUrl && map.isStyleLoaded()) {
                applyColoredMapPOICleanup(map);
                applyColoredMapSaturation(map);
                applyColoredMapRoadWidth(map);
            }
        };

        // After the style loads, apply POI filter (prebuilt styles only) then stitch.
        // Also keep a timer fallback; production tile/style loads can miss the exact
        // event ordering, and the preview must not remain blank.
        let didStyleCapture = false;
        const runStyleCapture = () => {
            if (didStyleCapture) return;
            didStyleCapture = true;
            clearTimeout(styleCaptureTimer);
            map.off('styledata', runStyleCapture);
            map.off('idle', runStyleCapture);
            if (mapStyleUrl && map.isStyleLoaded()) {
                applyColoredMapLabelScale(map, effectiveLabelScale(map, useStore.getState().mapLabelScale, map.getZoom(), (currentTargetPx() || TILE_CANVAS_SIZE) / TILE_CANVAS_SIZE));
                applyColoredMapPOICleanup(map);
                applyColoredMapSaturation(map);
                applyColoredMapRoadWidth(map);
            }
            captureStitched();
        };
        const styleCaptureTimer = setTimeout(runStyleCapture, TILE_SETTLE_TIMEOUT_MS);
        map.once('styledata', runStyleCapture);
        map.once('idle', runStyleCapture);
        map.on('styledata', applyStyleCleanup);
        map.on('idle', applyStyleCleanup);

        return () => {
            clearTimeout(styleCaptureTimer);
            map.off('styledata', runStyleCapture);
            map.off('idle', runStyleCapture);
            map.off('styledata', applyStyleCleanup);
            map.off('idle', applyStyleCleanup);
        };
    // Map colors intentionally excluded — the color effect below
    // handles those independently when mapStyleUrl is null.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapStyleUrl, mapColorPreset]);

    // ── Update 2-color style instantly via setPaintProperty (no tile reload) ──
    // Only applies when using the custom 2-color style (mapStyleUrl is null).
    // Strategy: update the WebGL style immediately, then publish only the
    // stitched capture so the poster image always stays high-resolution.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded() || mapStyleUrl !== null) return;
        if (mapColorPreset === 'design2') {
            const minorRoadColor = !mapSmallRoadColor || mapSmallRoadColor === '#1a1a1a' ? '#666666' : mapSmallRoadColor;
            const detailRoadColor = !mapDetailRoadColor || mapDetailRoadColor === '#2a2a2a' ? '#8a8a8a' : mapDetailRoadColor;

            map.setPaintProperty('background', 'background-color', mapBgColor);
            if (map.getLayer('landuse')) map.setPaintProperty('landuse', 'fill-color', mapLandColor);
            if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', mapWaterColor);
            if (map.getLayer('waterway')) map.setPaintProperty('waterway', 'line-color', mapWaterColor);
            if (map.getLayer('roads_detail')) map.setPaintProperty('roads_detail', 'line-color', detailRoadColor);
            if (map.getLayer('roads_small')) map.setPaintProperty('roads_small', 'line-color', minorRoadColor);
            if (map.getLayer('roads_major')) map.setPaintProperty('roads_major', 'line-color', mapMainRoadColor || mapStreetColor);
        } else if (!activePreset?.customStyle) {
            map.setPaintProperty('background', 'background-color', mapBgColor);
            map.setPaintProperty('water', 'fill-color', mapBgColor);
            map.setPaintProperty('roads_all', 'line-color', mapStreetColor);
        } else {
            return;
        }
        if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current);
        colorDebounceRef.current = setTimeout(() => captureStitched(), 250);
    }, [
        mapBgColor, mapStreetColor, mapWaterColor, mapLandColor,
        mapMainRoadColor, mapSmallRoadColor, mapDetailRoadColor,
        mapStyleUrl, mapColorPreset, captureStitched,
    ]);

    // ── Colored-map label size + pin de-clutter — apply to the prebuilt style, recapture ──
    useEffect(() => {
        const map = mapRef.current;
        if (!map || mapStyleUrl === null) return; // colored (prebuilt style) only
        if (map.isStyleLoaded()) {
            applyColoredMapLabelScale(map, effectiveLabelScale(map, mapLabelScale, map.getZoom(), (currentTargetPx() || TILE_CANVAS_SIZE) / TILE_CANVAS_SIZE));
            const { mapCenterLng: lng, mapCenterLat: lat } = storeRef.current;
            applyPinLabelDeclutter(map, { lng, lat, sizePx: locationPinSize * 1.4, enabled: showLocationPin });
            applyMaskEdgeLabelKeepout(map, { maskShape, enabled: false }); // disabled — see comment above applyMaskEdgeLabelKeepout: grid-based collision keepout over-suppressed legitimate interior labels in testing, needs rework before re-enabling
        }
        if (labelDebounceRef.current) clearTimeout(labelDebounceRef.current);
        labelDebounceRef.current = setTimeout(() => captureStitched(), 250);
    }, [mapLabelScale, showLocationPin, locationPinSize, mapStyleUrl, captureStitched]);

    // ── Synchronous version increment via Zustand subscription ───────────────
    // React useEffects run *after* the render, so there is a window where an
    // in-flight stitch could complete between setState() and the next effect,
    // slipping past a useEffect-based version check.  Zustand's subscribe fires
    // synchronously inside set(), so by the time any async stitch code resumes
    // the version is already incremented.
    useEffect(() => {
        return useStore.subscribe((state, prev) => {
            if (state.mapCenterLat   !== prev.mapCenterLat   ||
                state.mapCenterLng   !== prev.mapCenterLng   ||
                state.mapZoom        !== prev.mapZoom        ||
                state.mapBearing     !== prev.mapBearing     ||
                // Also invalidate stale stitches when style/type/colors change so
                // old-style captures can't overwrite new ones (global fix for all
                // map types — not just colored maps)
                state.mapStyleUrl    !== prev.mapStyleUrl    ||
                state.posterType     !== prev.posterType     ||
                state.mapBgColor     !== prev.mapBgColor     ||
                state.mapStreetColor !== prev.mapStreetColor ||
                state.mapWaterColor  !== prev.mapWaterColor  ||
                state.mapLandColor   !== prev.mapLandColor   ||
                state.mapMainRoadColor   !== prev.mapMainRoadColor   ||
                state.mapSmallRoadColor  !== prev.mapSmallRoadColor  ||
                state.mapDetailRoadColor !== prev.mapDetailRoadColor ||
                state.mapColorPreset !== prev.mapColorPreset) {
                captureVersionRef.current++;
            }
        });
    }, []);

    // ── Fly to new location / bearing when store coords change ────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        // Always apply the jump immediately so the user sees their zoom/pan change.
        // If a stitch is in flight, mark it pending so it restarts after completion.
        // captureVersionRef is already incremented (via subscription) so the stitch
        // detects the change and discards its stale result.
        if (isCapturingRef.current) pendingCaptureRef.current = true;
        map.jumpTo({ center: [mapCenterLng, mapCenterLat], zoom: Math.min(mapZoom, 20), bearing: mapBearing });
    }, [mapCenterLat, mapCenterLng, mapZoom, mapBearing]);

    // ── Print/download capture ────────────────────────────────────────────────
    // Registered in the store so DownloadButton can call it before exporting.
    // Uses the same seam-free single-canvas strategy as the preview. It is better
    // to scale a coherent capture than ship a higher-detail image with visible
    // viewport boundaries across the map.
    const captureHighRes = useCallback(async (options: MapCaptureOptions = {}): Promise<string> => {
        const map = mapRef.current;
        if (!map) throw new Error('Map not initialised');

        // Wait for any ongoing capture to finish
        while (isCapturingRef.current) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        isCapturingRef.current = true;
        // Non-null cast: we already returned above if map was null.
        const m = map as maplibregl.Map;

        const { mapCenterLat: lat, mapCenterLng: lng, mapZoom: zoom, mapBearing: bearing } = storeRef.current;
        const targetPx = Math.max(TILE_CANVAS_SIZE, Math.round(options.targetPx ?? TILE_CANVAS_SIZE));
        const detailScale = Math.max(1, options.detailScale ?? 1);

        if (targetPx > TILE_CANVAS_SIZE || detailScale > 1.05) {
            try {
                return await captureOffscreenMap({ lng, lat, zoom, bearing: bearing ?? 0, targetPx, detailScale });
            } finally {
                isCapturingRef.current = false;
            }
        }

        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = targetPx;
        captureCanvas.height = targetPx;
        const ctx = captureCanvas.getContext('2d')!;

        await waitForMapFrame(
            m,
            () => m.jumpTo({ center: [lng, lat], zoom: Math.min(zoom, 20), bearing: bearing ?? 0 }),
            () => ctx.drawImage(m.getCanvas(), 0, 0, targetPx, targetPx),
        );

        // Restore original position
        suppressNextMoveendRef.current = true;
        m.jumpTo({ center: [lng, lat], zoom: Math.min(zoom, 20), bearing: bearing ?? 0 });
        isCapturingRef.current = false;

        return canvasToDataUrl(captureCanvas, 'image/png');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        storeRef, mapStyleUrl, mapColorPreset,
        mapBgColor, mapStreetColor, mapWaterColor, mapLandColor,
        mapMainRoadColor, mapSmallRoadColor, mapDetailRoadColor,
    ]);

    // Register/unregister the high-res capture function in the store
    useEffect(() => {
        setCaptureHighResFn(captureHighRes);
        return () => setCaptureHighResFn(null);
    }, [captureHighRes, setCaptureHighResFn]);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', minHeight: '320px' }}
        />
    );
};

export default StreetMapCapture;
