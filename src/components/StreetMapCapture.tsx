import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore, type MapCaptureOptions } from '../store/useStore';
import { MAP_COLOR_PRESET_DATA } from './mapPresets';
import { calculateMapExportTarget } from '../utils/mapExportSizing';

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
const TILE_SETTLE_TIMEOUT_MS = 8000;

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
    if (cleanupState.__coloredMapPOICleanupApplied || !map.isStyleLoaded()) return;

    for (const layer of map.getStyle().layers ?? []) {
        if ((layer.id === 'poi_transit' || (layer as { 'source-layer'?: string })['source-layer'] === 'poi')
            && map.getLayer(layer.id)) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
    }

    cleanupState.__coloredMapPOICleanupApplied = true;
}

/**
 * Scale label text size on the prebuilt (colored) style. Captures each symbol layer's
 * base text-size once, then sets text-size = base × scale. Because labels are vector
 * text re-rendered at full print resolution, larger labels stay crisp at 300 DPI.
 */
function applyColoredMapLabelScale(map: maplibregl.Map, scale: number): void {
    if (!map.isStyleLoaded()) return;
    const state = map as maplibregl.Map & { __labelBaseSizes?: Record<string, unknown> };
    if (!state.__labelBaseSizes) state.__labelBaseSizes = {};
    const base = state.__labelBaseSizes;
    for (const layer of map.getStyle().layers ?? []) {
        if (layer.type !== 'symbol') continue;
        const hasText = (layer as { layout?: { 'text-field'?: unknown } }).layout?.['text-field'];
        if (!hasText || !map.getLayer(layer.id)) continue;
        if (!(layer.id in base)) {
            const cur = map.getLayoutProperty(layer.id, 'text-size');
            base[layer.id] = cur === undefined ? 16 : cur;
        }
        try {
            map.setLayoutProperty(
                layer.id, 'text-size',
                scale === 1 ? base[layer.id] : ['*', base[layer.id], scale] as unknown,
            );
        } catch { /* layer without text-size — ignore */ }
    }
}

/**
 * Reserve a collision box at the heart-pin location so the colored style's street/place
 * labels avoid the pin. Uses an invisible (opacity 0) icon symbol with `icon-allow-overlap:
 * true` (always placed) + `icon-ignore-placement: false` (other labels collide with it).
 */
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
        printSize,
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
            if (mapStyleUrl && tempMap.isStyleLoaded()) {
                applyColoredMapPOICleanup(tempMap);
                applyColoredMapLabelScale(tempMap, useStore.getState().mapLabelScale);
                applyPinLabelDeclutter(tempMap, { lng, lat, sizePx: useStore.getState().locationPinSize * 1.4, enabled: useStore.getState().showLocationPin });
                await waitForNextMapRender(tempMap);
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
                applyColoredMapLabelScale(m, useStore.getState().mapLabelScale);
                applyPinLabelDeclutter(m, { lng, lat, sizePx: useStore.getState().locationPinSize * 1.4, enabled: useStore.getState().showLocationPin });
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
            if (initialStyleUrl && map.isStyleLoaded()) applyColoredMapPOICleanup(map);
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
            if (initialStyleUrl && map.isStyleLoaded()) applyColoredMapPOICleanup(map);
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
            if (mapStyleUrl && map.isStyleLoaded()) applyColoredMapPOICleanup(map);
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
            if (mapStyleUrl && map.isStyleLoaded()) applyColoredMapPOICleanup(map);
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
            applyColoredMapLabelScale(map, mapLabelScale);
            const { mapCenterLng: lng, mapCenterLat: lat } = storeRef.current;
            applyPinLabelDeclutter(map, { lng, lat, sizePx: locationPinSize * 1.4, enabled: showLocationPin });
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
