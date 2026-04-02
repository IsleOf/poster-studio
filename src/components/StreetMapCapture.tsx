import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';

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

/** Rectangle template: white bg, black highways, gray minor roads + land use fills */
function createDesign2Style(): maplibregl.StyleSpecification {
    const bg = '#ffffff';
    const highwayColor  = '#111111';  // black — motorway, trunk
    const arterialColor = '#444444';  // dark gray — primary, secondary
    const streetColor   = '#777777';  // medium gray — tertiary, residential, minor
    const serviceColor  = '#aaaaaa';  // light gray — service lanes, paths
    const waterColor = '#888888';
    const landUseColor = '#cccccc';
    const buildingColor = '#dddddd';
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
            { id: 'background', type: 'background', paint: { 'background-color': bg } },
            { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water',
              paint: { 'fill-color': waterColor } },
            { id: 'waterway', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway',
              paint: { 'line-color': waterColor, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 14, 4] as maplibregl.ExpressionSpecification } },
            { id: 'landuse', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse',
              filter: ['in', ['get', 'class'], ['literal', ['grass', 'park', 'forest', 'recreation_ground', 'meadow', 'garden', 'wood', 'nature_reserve']]] as maplibregl.ExpressionSpecification,
              paint: { 'fill-color': landUseColor } },
            { id: 'building', type: 'fill', source: 'openmaptiles', 'source-layer': 'building',
              paint: { 'fill-color': buildingColor, 'fill-opacity': 0.9 } },
            {
                id: 'roads_all', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
                minzoom: 6,
                paint: {
                    'line-color': [
                        'match', ['get', 'class'],
                        'motorway',   highwayColor,
                        'trunk',      highwayColor,
                        'primary',    arterialColor,
                        'secondary',  arterialColor,
                        'tertiary',   streetColor,
                        'minor',      streetColor,
                        'residential',streetColor,
                        serviceColor,
                    ] as maplibregl.ExpressionSpecification,
                    'line-width': [
                        'interpolate', ['exponential', 1.5], ['zoom'],
                        6,  ['match', ['get', 'class'], 'motorway', 1.5, 'trunk', 1.2, 'primary', 0.7, 'secondary', 0.4, 0.15],
                        14, ['match', ['get', 'class'],
                            'motorway', 10, 'trunk', 8, 'primary', 5.5, 'secondary', 4,
                            'tertiary', 1.8, 'minor', 1.0, 'service', 0.6, 'residential', 1.0, 0.6,
                        ],
                        18, ['match', ['get', 'class'],
                            'motorway', 28, 'trunk', 24, 'primary', 16, 'secondary', 11,
                            'tertiary', 5, 'minor', 3, 'service', 1.8, 'residential', 3, 1.8,
                        ],
                    ] as maplibregl.ExpressionSpecification,
                },
            },
        ],
    };
}

export const MAP_COLOR_PRESETS: MapColorPreset[] = [
    { id: 'midnight',  name: 'Midnight',   bgColor: '#1a1a2e', streetColor: '#3d5a80' },
    { id: 'classic',   name: 'Classic',    bgColor: '#f5f0e8', streetColor: '#8b7355' },
    { id: 'forest',    name: 'Forest',     bgColor: '#1a2e1a', streetColor: '#4a7c59' },
    { id: 'ocean',     name: 'Ocean',      bgColor: '#0d1b2a', streetColor: '#1b4f72' },
    { id: 'rose-gold', name: 'Rose Gold',  bgColor: '#2d1b1b', streetColor: '#c9956a' },
    { id: 'blueprint', name: 'Blueprint',  bgColor: '#0a192f', streetColor: '#64ffda' },
    { id: 'sepia',     name: 'Sepia',      bgColor: '#2c1810', streetColor: '#d4a96a' },
    { id: 'neon',      name: 'Neon',       bgColor: '#0d0d0d', streetColor: '#ff00ff' },
    // ── Rectangle: white bg, black highways, gray minor roads + land use fills ─
    { id: 'design2', name: 'Rectangle (B&W)', bgColor: '#ffffff', streetColor: '#111111', customStyle: createDesign2Style },
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

// ─── Heritage POI filter ───────────────────────────────────────────────────────

/**
 * Filters every POI layer in the current style to show only heritage /
 * sightseeing markers (museums, historic sites, places of worship, viewpoints)
 * and hides business POIs (shops, restaurants, hotels, banks, etc.).
 * Called once after a prebuilt style (e.g. "Realistic") finishes loading.
 */
function applyHeritagePOIFilter(map: maplibregl.Map): void {
    const HERITAGE_FILTER = [
        'any',
        ['==', ['get', 'class'], 'historic'],
        ['==', ['get', 'class'], 'religion'],
        ['all',
            ['==', ['get', 'class'], 'tourism'],
            ['in', ['get', 'subclass'], ['literal', [
                'artwork', 'attraction', 'gallery', 'museum', 'viewpoint',
                'zoo', 'theme_park',
            ]]],
        ],
    ] as maplibregl.FilterSpecification;

    for (const layer of map.getStyle().layers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((layer as any)['source-layer'] === 'poi') {
            const existing = map.getFilter(layer.id);
            const combined: maplibregl.FilterSpecification = existing
                ? (['all', existing, HERITAGE_FILTER] as maplibregl.FilterSpecification)
                : HERITAGE_FILTER;
            map.setFilter(layer.id, combined);
        }
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface StreetMapCaptureProps {
    /** Called with a data-URL of the stitched 7200×7200 map canvas */
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

    const { mapCenterLat, mapCenterLng, mapZoom, mapBearing, mapStreetColor, posterColor, mapStyleUrl, mapColorPreset, setCaptureHighResFn } = useStore();
    const activePreset = MAP_COLOR_PRESETS.find(p => p.id === mapColorPreset);
    const getActiveStyle = () => activePreset?.customStyle ? activePreset.customStyle() : createMapStyle(posterColor, mapStreetColor);

    // Always-current snapshot of the map position — read inside async captureStitched
    const storeRef = useRef({ mapCenterLat, mapCenterLng, mapZoom, mapBearing });
    useEffect(() => {
        storeRef.current = { mapCenterLat, mapCenterLng, mapZoom, mapBearing };
    });

    /**
     * Captures a 2×2 grid of tiles at (displayZoom + 1) and stitches them into
     * a single 7200×7200 JPEG that covers the same geographic area as a single
     * displayZoom capture — but with one extra zoom level of tile detail.
     *
     * Critical ordering rule: always register map.once('idle') BEFORE calling
     * map.jumpTo(). If the listener is registered after jumpTo, tiles may already
     * be cached and the map might never leave the idle state, so the listener
     * would fire for a *future* unrelated event (capturing the wrong frame).
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
        // Snapshot the current version — if it changes before we finish, the result is stale
        const startVersion = captureVersionRef.current;
        // Non-null cast: we already returned above if map was null.
        const m = map as maplibregl.Map;

        const { mapCenterLat: lat, mapCenterLng: lng, mapZoom: zoom, mapBearing: bearing } = storeRef.current;
        // Cap at 20 — slider max; above 20 MapLibre scales up rather than loading
        // finer tiles, causing identical-tile artefacts and useless stitching.
        const effectiveZoom = Math.min(zoom, 20);
        const captureZoom = Math.min(effectiveZoom + 1, 21);

        const pixelOffset = 300;
        const lngPerPx = 360 / (512 * Math.pow(2, effectiveZoom));
        const lngOffset = pixelOffset * lngPerPx;

        const centerY = mercatorY(lat, zoom);
        const latNorth = latFromMercatorY(centerY - pixelOffset, zoom);
        const latSouth = latFromMercatorY(centerY + pixelOffset, zoom);

        const tiles = [
            { lat: latNorth, lng: lng - lngOffset }, // NW
            { lat: latNorth, lng: lng + lngOffset }, // NE
            { lat: latSouth, lng: lng - lngOffset }, // SW
            { lat: latSouth, lng: lng + lngOffset }, // SE
        ];

        const stitchedCanvas = document.createElement('canvas');
        stitchedCanvas.width  = TILE_CANVAS_SIZE * 2;
        stitchedCanvas.height = TILE_CANVAS_SIZE * 2;
        const ctx = stitchedCanvas.getContext('2d')!;

        for (let i = 0; i < 4; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            await new Promise<void>(resolve => {
                // Register BEFORE jumpTo so we can't miss the idle event
                // even when tiles are already cached.
                function onIdle() {
                    if (m.areTilesLoaded()) {
                        // All tiles at captureZoom are present — safe to capture.
                        ctx.drawImage(m.getCanvas(), col * TILE_CANVAS_SIZE, row * TILE_CANVAS_SIZE);
                        resolve();
                    } else {
                        // Some tiles still loading (parent-tile placeholders visible) —
                        // wait for the next idle, which fires once they arrive.
                        m.once('idle', onIdle);
                    }
                }
                m.once('idle', onIdle);
                m.jumpTo({ center: [tiles[i].lng, tiles[i].lat], zoom: captureZoom, bearing: bearing ?? 0 });
            });
        }

        // Restore to the CURRENT store position (user may have changed it mid-capture).
        // This avoids a visible snap-back to the pre-capture position.
        const { mapCenterLat: latNow, mapCenterLng: lngNow, mapZoom: zoomNow, mapBearing: bearingNow } = storeRef.current;
        suppressNextMoveendRef.current = true;
        m.jumpTo({ center: [lngNow, latNow], zoom: Math.min(zoomNow, 20), bearing: bearingNow ?? 0 });

        isCapturingRef.current = false;

        // Discard stale result — position changed while we were stitching
        if (captureVersionRef.current !== startVersion) {
            if (pendingCaptureRef.current) { pendingCaptureRef.current = false; captureStitched(); }
            return;
        }

        const dataUrl = await new Promise<string>((resolve, reject) => {
            stitchedCanvas.toBlob(blob => {
                if (!blob) { reject(new Error('toBlob failed')); return; }
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.92);
        });
        // Don't push the new image while the user is mid-drag — it would interrupt
        // their drag gesture by causing the SVG effect to re-run and reset the offset.
        // After drag ends, the coordinate useEffect fires map.jumpTo() which triggers
        // another captureStitched, so the image will update shortly after.
        if (!useStore.getState().isDraggingMapImage) {
            onCapture(dataUrl);
        }

        if (pendingCaptureRef.current) {
            pendingCaptureRef.current = false;
            captureStitched();
        }
    }, [onCapture]);

    /**
     * Fast single-tile capture — downscaled to ~800px so the data URL is small
     * (~50 KB vs ~1 MB) and React re-renders are near-instant.
     * Used for live preview while the user is dragging/zooming.
     */
    const captureQuick = useCallback(() => {
        const map = mapRef.current;
        if (!map || isCapturingRef.current) return;
        map.once('idle', () => {
            if (useStore.getState().isDraggingMapImage) return;
            const src = map.getCanvas();
            const PREVIEW_SIZE = 800;
            const preview = document.createElement('canvas');
            preview.width  = PREVIEW_SIZE;
            preview.height = PREVIEW_SIZE;
            preview.getContext('2d')!.drawImage(src, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
            preview.toBlob(blob => {
                if (!blob) return;
                const reader = new FileReader();
                reader.onload = () => onCapture(reader.result as string);
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.75);
        });
        map.triggerRepaint();
    }, [onCapture]);

    // ── Initialize map once ────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const initialStyleUrl = useStore.getState().mapStyleUrl;
        const initialPresetId = useStore.getState().mapColorPreset;
        const initialPreset = MAP_COLOR_PRESETS.find(p => p.id === initialPresetId);
        const initialStyle = initialStyleUrl ?? (initialPreset?.customStyle ? initialPreset.customStyle() : createMapStyle(posterColor, mapStreetColor));

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

        map.on('load', () => {
            mapRef.current = map;
            if (initialStyleUrl) applyHeritagePOIFilter(map);
            captureStitched();
        });

        map.on('moveend', () => {
            if (suppressNextMoveendRef.current) {
                suppressNextMoveendRef.current = false;
                return;
            }
            // Ignore moves our own capture code triggered (stitch tile jumps)
            if (isCapturingRef.current) return;
            // Wait 1.2 s after the last moveend before stitching — ensures the
            // user has finished dragging/zooming before we start the 4-tile capture.
            if (stitchDebounceRef.current) clearTimeout(stitchDebounceRef.current);
            stitchDebounceRef.current = setTimeout(() => captureStitched(), 1200);
        });

        return () => {
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

        const newStyle = mapStyleUrl ?? getActiveStyle();
        map.setStyle(newStyle);

        // After the style loads, apply POI filter (prebuilt styles only) then stitch
        map.once('styledata', () => {
            if (mapStyleUrl) applyHeritagePOIFilter(map);
            captureStitched();
        });
    // posterColor/mapStreetColor intentionally excluded — the color effect below
    // handles those independently when mapStyleUrl is null.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapStyleUrl]);

    // ── Update 2-color style instantly via setPaintProperty (no tile reload) ──
    // Only applies when using the custom 2-color style (mapStyleUrl is null).
    // Strategy: fast single-tile capture for instant preview, then full stitch
    // after 1.2s debounce so rapid color-picker dragging stays smooth.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded() || mapStyleUrl !== null || activePreset?.customStyle) return;
        map.setPaintProperty('background', 'background-color', posterColor);
        map.setPaintProperty('water', 'fill-color', posterColor);
        map.setPaintProperty('roads_all', 'line-color', mapStreetColor);
        captureQuick();
        if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current);
        colorDebounceRef.current = setTimeout(() => captureStitched(), 1200);
    }, [posterColor, mapStreetColor, mapStyleUrl, captureQuick, captureStitched]);

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
                state.mapColorPreset !== prev.mapColorPreset) {
                captureVersionRef.current++;
            }
        });
    }, []);

    // ── Fly to new location / bearing when store coords change ────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        // Never interrupt an ongoing stitch — it reads storeRef.current at each
        // iteration so it will naturally pick up the latest position.
        if (isCapturingRef.current) {
            pendingCaptureRef.current = true;
            return;
        }
        map.jumpTo({ center: [mapCenterLng, mapCenterLat], zoom: Math.min(mapZoom, 20), bearing: mapBearing });
    }, [mapCenterLat, mapCenterLng, mapZoom, mapBearing]);

    // ── High-res print capture — 3×3 grid at zoom+2 ───────────────────────────
    // Registered in the store so DownloadButton can call it before exporting.
    // Produces a 10800×10800 JPEG (3 × 3600px tiles × 3×3 grid) — sufficient
    // for prints up to 36×36" at 300 DPI with twice the tile-detail of preview.
    const captureHighRes = useCallback(async (): Promise<string> => {
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
        const effectiveZoom = Math.min(zoom, 20);
        // Capture at zoom+2 for extra tile detail (one more doubling vs preview stitch)
        const captureZoom = Math.min(effectiveZoom + 2, 21);

        // 3×3 grid: offsets of -400, 0, +400 px at display zoom
        // At captureZoom=zoom+2, 1200 CSS px covers 300 display-px, so centres 400px apart
        // cover: -400-150=-550 … +400+150=+550 display px → ~1100×1100 px at display zoom.
        // Multiply by PIXEL_RATIO=3: 10800×10800 output.
        const offsets = [-400, 0, 400];
        const lngPerPx = 360 / (512 * Math.pow(2, effectiveZoom));
        const centerY = mercatorY(lat, effectiveZoom);

        const GRID = 3;
        const stitched = document.createElement('canvas');
        stitched.width  = TILE_CANVAS_SIZE * GRID;
        stitched.height = TILE_CANVAS_SIZE * GRID;
        const ctx = stitched.getContext('2d')!;

        for (let row = 0; row < GRID; row++) {
            for (let col = 0; col < GRID; col++) {
                const lngOffset = offsets[col] * lngPerPx;
                const latCenter = latFromMercatorY(centerY + offsets[row], effectiveZoom);
                await new Promise<void>(resolve => {
                    function onIdle() {
                        if (m.areTilesLoaded()) {
                            ctx.drawImage(m.getCanvas(), col * TILE_CANVAS_SIZE, row * TILE_CANVAS_SIZE);
                            resolve();
                        } else {
                            m.once('idle', onIdle);
                        }
                    }
                    m.once('idle', onIdle);
                    m.jumpTo({ center: [lng + lngOffset, latCenter], zoom: captureZoom });
                });
            }
        }

        // Restore original position
        suppressNextMoveendRef.current = true;
        m.jumpTo({ center: [lng, lat], zoom: effectiveZoom, bearing: bearing ?? 0 });
        isCapturingRef.current = false;

        return new Promise<string>((resolve, reject) => {
            stitched.toBlob(blob => {
                if (!blob) { reject(new Error('toBlob failed')); return; }
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.94);
        });
    }, [storeRef]);

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
