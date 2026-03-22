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
};

export const MAP_COLOR_PRESETS: MapColorPreset[] = [
    { id: 'midnight',  name: 'Midnight',   bgColor: '#1a1a2e', streetColor: '#3d5a80' },
    { id: 'classic',   name: 'Classic',    bgColor: '#f5f0e8', streetColor: '#8b7355' },
    { id: 'forest',    name: 'Forest',     bgColor: '#1a2e1a', streetColor: '#4a7c59' },
    { id: 'ocean',     name: 'Ocean',      bgColor: '#0d1b2a', streetColor: '#1b4f72' },
    { id: 'rose-gold', name: 'Rose Gold',  bgColor: '#2d1b1b', streetColor: '#c9956a' },
    { id: 'blueprint', name: 'Blueprint',  bgColor: '#0a192f', streetColor: '#64ffda' },
    { id: 'sepia',     name: 'Sepia',      bgColor: '#2c1810', streetColor: '#d4a96a' },
    { id: 'neon',      name: 'Neon',       bgColor: '#0d0d0d', streetColor: '#ff00ff' },
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
    const colorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { mapCenterLat, mapCenterLng, mapZoom, mapStreetColor, posterColor, mapStyleUrl } = useStore();

    // Always-current snapshot of the map position — read inside async captureStitched
    const storeRef = useRef({ mapCenterLat, mapCenterLng, mapZoom });
    useEffect(() => {
        storeRef.current = { mapCenterLat, mapCenterLng, mapZoom };
    });

    /**
     * Captures a 2×2 grid of tiles at (displayZoom + 1) and stitches them into
     * a single 7200×7200 JPEG that covers the same geographic area as a single
     * displayZoom capture — but with one extra zoom level of tile detail.
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

        const { mapCenterLat: lat, mapCenterLng: lng, mapZoom: zoom } = storeRef.current;
        const captureZoom = zoom + 1;

        const pixelOffset = 300;
        const lngPerPx = 360 / (512 * Math.pow(2, zoom));
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
                map.once('idle', () => {
                    ctx.drawImage(map.getCanvas(), col * TILE_CANVAS_SIZE, row * TILE_CANVAS_SIZE);
                    resolve();
                });
                map.jumpTo({ center: [tiles[i].lng, tiles[i].lat], zoom: captureZoom });
            });
        }

        suppressNextMoveendRef.current = true;
        map.jumpTo({ center: [lng, lat], zoom });

        isCapturingRef.current = false;

        const dataUrl = await new Promise<string>((resolve, reject) => {
            stitchedCanvas.toBlob(blob => {
                if (!blob) { reject(new Error('toBlob failed')); return; }
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.92);
        });
        onCapture(dataUrl);

        if (pendingCaptureRef.current) {
            pendingCaptureRef.current = false;
            captureStitched();
        }
    }, [onCapture]);

    /**
     * Fast single-tile capture — used for immediate color-change preview (~100ms).
     */
    const captureQuick = useCallback(() => {
        const map = mapRef.current;
        if (!map || isCapturingRef.current) return;
        map.once('idle', () => {
            map.getCanvas().toBlob(blob => {
                if (!blob) return;
                const reader = new FileReader();
                reader.onload = () => onCapture(reader.result as string);
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.92);
        });
        map.triggerRepaint();
    }, [onCapture]);

    // ── Initialize map once ────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const initialStyleUrl = useStore.getState().mapStyleUrl;
        const initialStyle = initialStyleUrl ?? createMapStyle(posterColor, mapStreetColor);

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: initialStyle,
            center: [mapCenterLng, mapCenterLat],
            zoom: mapZoom,
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
            if (!isCapturingRef.current) {
                captureStitched();
            }
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

        const newStyle = mapStyleUrl ?? createMapStyle(posterColor, mapStreetColor);
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
        if (!map || !map.isStyleLoaded() || mapStyleUrl !== null) return;
        map.setPaintProperty('background', 'background-color', posterColor);
        map.setPaintProperty('water', 'fill-color', posterColor);
        map.setPaintProperty('roads_all', 'line-color', mapStreetColor);
        captureQuick();
        if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current);
        colorDebounceRef.current = setTimeout(() => captureStitched(), 1200);
    }, [posterColor, mapStreetColor, mapStyleUrl, captureQuick, captureStitched]);

    // ── Fly to new location when store coords change ───────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo({ center: [mapCenterLng, mapCenterLat], zoom: mapZoom, duration: 1200 });
    }, [mapCenterLat, mapCenterLng, mapZoom]);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', minHeight: '320px' }}
        />
    );
};

export default StreetMapCapture;
