import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';
import { MAP_COLOR_PRESET_DATA } from './mapPresets';

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

// Re-export the base preset data under the original name for backward compatibility
export { MAP_COLOR_PRESET_DATA as MAP_COLOR_PRESETS };

/** Monochrome street-map template: road linework and land/water masses, no building footprints. */
function createDesign2Style(): maplibregl.StyleSpecification {
    const bg = '#e8e5dd';
    const waterColor = '#8f8f8f';
    const landUseColor = '#a8a8a3';
    const majorRoadColor = '#171717';
    const arterialRoadColor = '#303030';
    const localRoadColor = '#666666';
    const serviceRoadColor = '#8a8a8a';
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
                paint: { 'fill-color': landUseColor, 'fill-opacity': 0.82 },
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
                id: 'roads_all', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
                minzoom: 6,
                paint: {
                    'line-color': [
                        'match', ['get', 'class'],
                        'motorway', majorRoadColor,
                        'trunk', majorRoadColor,
                        'primary', arterialRoadColor,
                        'secondary', arterialRoadColor,
                        'tertiary', localRoadColor,
                        'minor', localRoadColor,
                        'residential', localRoadColor,
                        'service', serviceRoadColor,
                        'path', serviceRoadColor,
                        'track', serviceRoadColor,
                        localRoadColor,
                    ] as maplibregl.ExpressionSpecification,
                    'line-width': [
                        'interpolate', ['exponential', 1.5], ['zoom'],
                        6,  ['match', ['get', 'class'], 'motorway', 1.8, 'trunk', 1.5, 'primary', 0.9, 'secondary', 0.6, 0.2],
                        14, ['match', ['get', 'class'],
                            'motorway', 6.8, 'trunk', 5.8, 'primary', 3.8, 'secondary', 2.4,
                            'tertiary', 1.05, 'minor', 0.45, 'service', 0.35, 'residential', 0.55, 0.35,
                        ],
                        18, ['match', ['get', 'class'],
                            'motorway', 15, 'trunk', 13, 'primary', 8.5, 'secondary', 5.5,
                            'tertiary', 2.3, 'minor', 1.0, 'service', 0.75, 'residential', 1.15, 0.8,
                        ],
                    ] as maplibregl.ExpressionSpecification,
                    'line-opacity': 0.95,
                },
            },
        ],
    };
}

// Full presets with style factory functions — used internally by StreetMapCapture
const MAP_COLOR_PRESETS_FULL: MapColorPreset[] = [
    ...MAP_COLOR_PRESET_DATA.filter(p => p.id !== 'design2' && p.id !== 'realistic'),
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
const TILE_SETTLE_TIMEOUT_MS = 1200;

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

    for (const layer of map.getStyle().layers ?? []) {
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
    const didSkipInitialStyleEffectRef = useRef(false);

    const { mapCenterLat, mapCenterLng, mapZoom, mapBearing, mapStreetColor, posterColor, mapStyleUrl, mapColorPreset, setCaptureHighResFn } = useStore();
    const activePreset = MAP_COLOR_PRESETS_FULL.find(p => p.id === mapColorPreset);
    const getActiveStyle = () => activePreset?.customStyle ? activePreset.customStyle() : createMapStyle(posterColor, mapStreetColor);

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
        // Snapshot the current version — if it changes before we finish, the result is stale
        const startVersion = captureVersionRef.current;
        // Non-null cast: we already returned above if map was null.
        const m = map as maplibregl.Map;

        const { mapCenterLat: lat, mapCenterLng: lng, mapZoom: zoom, mapBearing: bearing } = storeRef.current;
        // Cap at 20 — slider max; above 20 MapLibre scales up rather than loading
        // finer tiles, causing identical-tile artefacts and useless stitching.
        const effectiveZoom = Math.min(zoom, 20);

        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = TILE_CANVAS_SIZE;
        captureCanvas.height = TILE_CANVAS_SIZE;
        const ctx = captureCanvas.getContext('2d')!;

        try {
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

            const dataUrl = await new Promise<string>((resolve, reject) => {
                captureCanvas.toBlob(blob => {
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
        } catch (error) {
            console.error('Failed to capture stitched map preview', error);
        } finally {
            isCapturingRef.current = false;
            if (pendingCaptureRef.current) {
                pendingCaptureRef.current = false;
                captureStitched();
            }
        }
    }, [onCapture]);

    // ── Initialize map once ────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const initialStyleUrl = useStore.getState().mapStyleUrl;
        const initialPresetId = useStore.getState().mapColorPreset;
        const initialPreset = MAP_COLOR_PRESETS_FULL.find(p => p.id === initialPresetId);
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

        mapRef.current = map;

        let didInitialCapture = false;
        const runInitialCapture = () => {
            if (didInitialCapture) return;
            didInitialCapture = true;
            clearTimeout(initialCaptureTimer);
            map.off('load', runInitialCapture);
            map.off('idle', runInitialCapture);
            if (initialStyleUrl && map.isStyleLoaded()) applyHeritagePOIFilter(map);
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
        map.setStyle(newStyle);

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
            if (mapStyleUrl && map.isStyleLoaded()) applyHeritagePOIFilter(map);
            captureStitched();
        };
        const styleCaptureTimer = setTimeout(runStyleCapture, TILE_SETTLE_TIMEOUT_MS);
        map.once('styledata', runStyleCapture);
        map.once('idle', runStyleCapture);

        return () => {
            clearTimeout(styleCaptureTimer);
            map.off('styledata', runStyleCapture);
            map.off('idle', runStyleCapture);
        };
    // posterColor/mapStreetColor intentionally excluded — the color effect below
    // handles those independently when mapStyleUrl is null.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapStyleUrl]);

    // ── Update 2-color style instantly via setPaintProperty (no tile reload) ──
    // Only applies when using the custom 2-color style (mapStyleUrl is null).
    // Strategy: update the WebGL style immediately, then publish only the
    // stitched capture so the poster image always stays high-resolution.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded() || mapStyleUrl !== null || activePreset?.customStyle) return;
        map.setPaintProperty('background', 'background-color', posterColor);
        map.setPaintProperty('water', 'fill-color', posterColor);
        map.setPaintProperty('roads_all', 'line-color', mapStreetColor);
        if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current);
        colorDebounceRef.current = setTimeout(() => captureStitched(), 250);
    }, [posterColor, mapStreetColor, mapStyleUrl, captureStitched]);

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
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = TILE_CANVAS_SIZE;
        captureCanvas.height = TILE_CANVAS_SIZE;
        const ctx = captureCanvas.getContext('2d')!;

        await waitForMapFrame(
            m,
            () => m.jumpTo({ center: [lng, lat], zoom: effectiveZoom, bearing: bearing ?? 0 }),
            () => ctx.drawImage(m.getCanvas(), 0, 0, TILE_CANVAS_SIZE, TILE_CANVAS_SIZE),
        );

        // Restore original position
        suppressNextMoveendRef.current = true;
        m.jumpTo({ center: [lng, lat], zoom: effectiveZoom, bearing: bearing ?? 0 });
        isCapturingRef.current = false;

        return new Promise<string>((resolve, reject) => {
            captureCanvas.toBlob(blob => {
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
