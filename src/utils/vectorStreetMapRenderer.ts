import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';

type Point = { x: number; y: number };

export type VectorStreetMapRender = {
    waterD: string;
    waterwayD: string;
    landuseD: string;
    detailRoadD: string;
    smallRoadD: string;
    majorRoadD: string;
    majorRoadWidth: number;
    smallRoadWidth: number;
    detailRoadWidth: number;
    waterwayWidth: number;
    majorRoadUnderlayWidth: number;
    smallRoadUnderlayWidth: number;
    detailRoadUnderlayWidth: number;
};

export type VectorStreetMapOptions = {
    lng: number;
    lat: number;
    zoom: number;
    bearing: number;
    x: number;
    y: number;
    size: number;
};

const TILEJSON_URL = 'https://tiles.openfreemap.org/planet';
const TILE_SIZE = 512;
const MAX_SOURCE_ZOOM = 14;
const MIN_STREET_DETAIL_SOURCE_ZOOM = 14;
const TILE_FETCH_TIMEOUT_MS = 15000;
const TILE_FETCH_CONCURRENCY = 8;
const TILE_FETCH_RETRIES = 2;

let tileUrlTemplatePromise: Promise<string> | null = null;
const tileCache = new Map<string, Promise<VectorTile>>();

async function fetchJsonWithTimeout(url: string): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TILE_FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`TileJSON failed: ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchArrayBufferWithTimeout(url: string): Promise<ArrayBuffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TILE_FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Vector tile failed: ${res.status}`);
        return await res.arrayBuffer();
    } finally {
        clearTimeout(timeout);
    }
}

function degToRad(deg: number): number {
    return deg * Math.PI / 180;
}

function lngLatToWorld(lng: number, lat: number, zoom: number): Point {
    const scale = TILE_SIZE * Math.pow(2, zoom);
    const sinLat = Math.sin(degToRad(Math.max(-85.05112878, Math.min(85.05112878, lat))));
    return {
        x: (lng + 180) / 360 * scale,
        y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
    };
}

function tileIndexToNorm(value: number, zoom: number): number {
    return value / Math.pow(2, zoom);
}

function wrapTileX(x: number, zoom: number): number {
    const n = Math.pow(2, zoom);
    return ((x % n) + n) % n;
}

async function getTileUrlTemplate(): Promise<string> {
    if (!tileUrlTemplatePromise) {
        tileUrlTemplatePromise = fetchJsonWithTimeout(TILEJSON_URL)
            .then(json => {
                const template = json?.tiles?.[0];
                if (typeof template !== 'string') throw new Error('TileJSON has no vector tile URL template');
                return template;
            })
            .catch(error => {
                tileUrlTemplatePromise = null;
                throw error;
            });
    }
    return tileUrlTemplatePromise;
}

async function fetchTile(z: number, x: number, y: number): Promise<VectorTile> {
    const safeX = wrapTileX(x, z);
    const maxY = Math.pow(2, z) - 1;
    if (y < 0 || y > maxY) throw new Error(`Tile y out of range: ${z}/${safeX}/${y}`);

    const key = `${z}/${safeX}/${y}`;
    if (!tileCache.has(key)) {
        const tilePromise = getTileUrlTemplate().then(async template => {
            const url = template
                .replace('{z}', String(z))
                .replace('{x}', String(safeX))
                .replace('{y}', String(y));
            return new VectorTile(new Pbf(new Uint8Array(await fetchArrayBufferWithTimeout(url))));
        }).catch(error => {
            tileCache.delete(key);
            throw error;
        });
        tileCache.set(key, tilePromise);
    }
    return tileCache.get(key)!;
}

async function fetchTileWithRetry(z: number, x: number, y: number): Promise<VectorTile> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= TILE_FETCH_RETRIES; attempt++) {
        try {
            return await fetchTile(z, x, y);
        } catch (error) {
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
        }
    }
    throw lastError;
}

function formatCoord(n: number): string {
    return Number.isFinite(n) ? n.toFixed(2).replace(/\.?0+$/, '') : '0';
}

function geometryToPath(
    geometry: Point[][],
    tileX: number,
    tileY: number,
    sourceZoom: number,
    extent: number,
    centerWorld: Point,
    renderZoom: number,
    outX: number,
    outY: number,
    outSize: number,
    bearing: number,
    close: boolean,
): string {
    const renderWorldSize = TILE_SIZE * Math.pow(2, renderZoom);
    const cosBearing = Math.cos(degToRad(bearing));
    const sinBearing = Math.sin(degToRad(bearing));
    const clipMargin = 64;
    const minPointDistance = 0.25;
    const minX = outX - clipMargin;
    const minY = outY - clipMargin;
    const maxX = outX + outSize + clipMargin;
    const maxY = outY + outSize + clipMargin;
    let d = '';

    for (const part of geometry) {
        if (part.length < 2) continue;
        const projected: Point[] = [];
        let partMinX = Infinity;
        let partMinY = Infinity;
        let partMaxX = -Infinity;
        let partMaxY = -Infinity;

        for (const p of part) {
            const normX = tileIndexToNorm(tileX + p.x / extent, sourceZoom);
            const normY = tileIndexToNorm(tileY + p.y / extent, sourceZoom);
            const worldX = normX * renderWorldSize;
            const worldY = normY * renderWorldSize;
            const dx = worldX - centerWorld.x;
            const dy = worldY - centerWorld.y;
            const rx = dx * cosBearing - dy * sinBearing;
            const ry = dx * sinBearing + dy * cosBearing;
            const sx = outX + outSize / 2 + rx;
            const sy = outY + outSize / 2 + ry;

            projected.push({ x: sx, y: sy });
            partMinX = Math.min(partMinX, sx);
            partMinY = Math.min(partMinY, sy);
            partMaxX = Math.max(partMaxX, sx);
            partMaxY = Math.max(partMaxY, sy);
        }

        if (partMaxX < minX || partMinX > maxX || partMaxY < minY || partMinY > maxY) continue;

        let started = false;
        let lastX = NaN;
        let lastY = NaN;
        for (let i = 0; i < projected.length; i++) {
            const point = projected[i];
            const isLast = i === projected.length - 1;
            if (started && !isLast) {
                const dx = point.x - lastX;
                const dy = point.y - lastY;
                if ((dx * dx + dy * dy) < minPointDistance * minPointDistance) continue;
            }
            d += `${started ? 'L' : 'M'}${formatCoord(point.x)} ${formatCoord(point.y)}`;
            started = true;
            lastX = point.x;
            lastY = point.y;
        }
        if (started && close) d += 'Z';
    }

    return d;
}

function interpolateStops(zoom: number, stops: Array<[number, number]>): number {
    if (zoom <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
        const [prevZoom, prevValue] = stops[i - 1];
        const [nextZoom, nextValue] = stops[i];
        if (zoom <= nextZoom) {
            const t = (zoom - prevZoom) / (nextZoom - prevZoom);
            return prevValue + (nextValue - prevValue) * t;
        }
    }
    return stops[stops.length - 1][1];
}

function roadWidths(zoom: number): Pick<VectorStreetMapRender,
    'majorRoadWidth' | 'smallRoadWidth' | 'detailRoadWidth' | 'waterwayWidth'
    | 'majorRoadUnderlayWidth' | 'smallRoadUnderlayWidth' | 'detailRoadUnderlayWidth'
> {
    return {
        // Keep these in visual sync with createDesign2Style() in StreetMapCapture.tsx.
        // The background underlay/casing is required so raw vector-tile road
        // geometry reads like the approved raster MapLibre style.
        waterwayWidth: interpolateStops(zoom, [[8, 0.7], [14, 2.6], [18, 5.2]]),
        detailRoadUnderlayWidth: interpolateStops(zoom, [[10, 1.0], [13, 1.8], [16, 3.2], [18, 4.5]]),
        smallRoadUnderlayWidth: interpolateStops(zoom, [[9, 1.5], [13, 2.8], [16, 5.0], [18, 7.0]]),
        majorRoadUnderlayWidth: interpolateStops(zoom, [[7, 2.0], [13, 4.2], [16, 7.0], [18, 10.0]]),
        detailRoadWidth: interpolateStops(zoom, [[10, 0.55], [13, 0.9], [16, 1.8], [18, 2.6]]),
        smallRoadWidth: interpolateStops(zoom, [[9, 0.8], [13, 1.4], [16, 2.8], [18, 4.0]]),
        majorRoadWidth: interpolateStops(zoom, [[7, 1.2], [13, 2.8], [16, 4.8], [18, 7.0]]),
    };
}

export function isVectorStreetMapEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    const override = window.localStorage.getItem('posterStudio.vectorMapRenderer');
    if (override === '0' || override === 'false') return false;
    if (override === '1' || override === 'true') return true;
    return import.meta.env.VITE_VECTOR_MAP_RENDERER !== 'false';
}

export async function renderVectorStreetMap(options: VectorStreetMapOptions): Promise<VectorStreetMapRender> {
    // The SVG map image is larger than the visible clip. Increase render zoom by
    // the same ratio so the output covers the same geographic bounds as the
    // MapLibre capture image, but remains vector at any export size.
    const renderZoom = Math.min(options.zoom + Math.log2(options.size / 1200), 20);
    // Do not let zoomed-out poster views use generalized low-zoom vector tiles.
    // Print output can resolve many fine streets even when the map covers a city,
    // so keep source tiles at street-detail zoom and project them into the same
    // geographic bounds instead of changing the visual map zoom.
    const sourceZoom = Math.max(
        0,
        Math.min(MAX_SOURCE_ZOOM, Math.max(MIN_STREET_DETAIL_SOURCE_ZOOM, Math.floor(renderZoom)))
    );
    const centerWorld = lngLatToWorld(options.lng, options.lat, renderZoom);
    const half = options.size / 2;
    const topLeft = { x: centerWorld.x - half, y: centerWorld.y - half };
    const bottomRight = { x: centerWorld.x + half, y: centerWorld.y + half };
    const renderWorldSize = TILE_SIZE * Math.pow(2, renderZoom);
    const sourceTileCount = Math.pow(2, sourceZoom);

    const minTileX = Math.floor((topLeft.x / renderWorldSize) * sourceTileCount) - 1;
    const maxTileX = Math.floor((bottomRight.x / renderWorldSize) * sourceTileCount) + 1;
    const minTileY = Math.max(0, Math.floor((topLeft.y / renderWorldSize) * sourceTileCount) - 1);
    const maxTileY = Math.min(sourceTileCount - 1, Math.floor((bottomRight.y / renderWorldSize) * sourceTileCount) + 1);

    const majorClasses = new Set(['motorway', 'trunk', 'primary', 'secondary']);
    const smallClasses = new Set(['tertiary', 'minor', 'residential', 'unclassified']);
    const detailClasses = new Set(['service']);
    const landuseClasses = new Set([
        'grass', 'park', 'forest', 'recreation_ground', 'meadow', 'garden', 'wood',
        'nature_reserve', 'cemetery', 'hospital', 'school', 'industrial', 'railway',
    ]);

    let waterD = '';
    let waterwayD = '';
    let landuseD = '';
    let detailRoadD = '';
    let smallRoadD = '';
    let majorRoadD = '';

    const tileCoords: Array<{ x: number; y: number }> = [];
    for (let x = minTileX; x <= maxTileX; x++) {
        for (let y = minTileY; y <= maxTileY; y++) {
            tileCoords.push({ x, y });
        }
    }

    let nextTileIndex = 0;
    const workers = Array.from({ length: Math.min(TILE_FETCH_CONCURRENCY, tileCoords.length) }, async () => {
        while (nextTileIndex < tileCoords.length) {
            const { x, y } = tileCoords[nextTileIndex++];
            try {
                const tile = await fetchTileWithRetry(sourceZoom, x, y);
                const water = tile.layers.water;
                if (water) {
                    for (let i = 0; i < water.length; i++) {
                        const feature = water.feature(i);
                        if (feature.type !== 3) continue;
                        waterD += geometryToPath(feature.loadGeometry(), wrapTileX(x, sourceZoom), y, sourceZoom, feature.extent, centerWorld, renderZoom, options.x, options.y, options.size, options.bearing, true);
                    }
                }

                const waterway = tile.layers.waterway;
                if (waterway) {
                    for (let i = 0; i < waterway.length; i++) {
                        const feature = waterway.feature(i);
                        if (feature.type !== 2) continue;
                        waterwayD += geometryToPath(feature.loadGeometry(), wrapTileX(x, sourceZoom), y, sourceZoom, feature.extent, centerWorld, renderZoom, options.x, options.y, options.size, options.bearing, false);
                    }
                }

                const landuse = tile.layers.landuse;
                if (landuse) {
                    for (let i = 0; i < landuse.length; i++) {
                        const feature = landuse.feature(i);
                        if (feature.type !== 3) continue;
                        if (!landuseClasses.has(String(feature.properties.class ?? ''))) continue;
                        landuseD += geometryToPath(feature.loadGeometry(), wrapTileX(x, sourceZoom), y, sourceZoom, feature.extent, centerWorld, renderZoom, options.x, options.y, options.size, options.bearing, true);
                    }
                }

                const roads = tile.layers.transportation;
                if (roads) {
                    for (let i = 0; i < roads.length; i++) {
                        const feature = roads.feature(i);
                        if (feature.type !== 2) continue;
                        const klass = String(feature.properties.class ?? '');
                        const d = geometryToPath(feature.loadGeometry(), wrapTileX(x, sourceZoom), y, sourceZoom, feature.extent, centerWorld, renderZoom, options.x, options.y, options.size, options.bearing, false);
                        if (majorClasses.has(klass)) majorRoadD += d;
                        else if (smallClasses.has(klass)) smallRoadD += d;
                        else if (detailClasses.has(klass)) detailRoadD += d;
                    }
                }
            } catch {
                // Keep rendering partial maps rather than blocking the editor,
                // but bounded retries above should prevent normal tile gaps.
            }
        }
    });

    await Promise.all(workers);
    return {
        waterD,
        waterwayD,
        landuseD,
        detailRoadD,
        smallRoadD,
        majorRoadD,
        ...roadWidths(options.zoom),
    };
}
