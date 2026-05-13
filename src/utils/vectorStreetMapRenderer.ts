import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';

type Point = { x: number; y: number };

export type VectorStreetMapRender = {
    waterD: string;
    landuseD: string;
    detailRoadD: string;
    smallRoadD: string;
    majorRoadD: string;
    majorRoadWidth: number;
    smallRoadWidth: number;
    detailRoadWidth: number;
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
const TILE_FETCH_TIMEOUT_MS = 15000;

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
    const sourceScale = Math.pow(2, sourceZoom);
    const renderWorldSize = TILE_SIZE * Math.pow(2, renderZoom);
    const cosBearing = Math.cos(degToRad(bearing));
    const sinBearing = Math.sin(degToRad(bearing));
    let d = '';

    for (const part of geometry) {
        if (part.length < 2) continue;
        let started = false;
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
            d += `${started ? 'L' : 'M'}${formatCoord(sx)} ${formatCoord(sy)}`;
            started = true;
        }
        if (started && close) d += 'Z';
    }

    return d;
}

function roadWidths(zoom: number): Pick<VectorStreetMapRender, 'majorRoadWidth' | 'smallRoadWidth' | 'detailRoadWidth'> {
    const closeRamp = Math.max(0, zoom - 13);
    return {
        majorRoadWidth: 2.6 + closeRamp * 1.0,
        smallRoadWidth: 1.35 + closeRamp * 0.85,
        detailRoadWidth: 0.8 + closeRamp * 0.55,
    };
}

export function isVectorStreetMapEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('posterStudio.vectorMapRenderer') === '1'
        || import.meta.env.VITE_VECTOR_MAP_RENDERER === 'true';
}

export async function renderVectorStreetMap(options: VectorStreetMapOptions): Promise<VectorStreetMapRender> {
    // The SVG map image is larger than the visible clip. Increase render zoom by
    // the same ratio so the output covers the same geographic bounds as the
    // MapLibre capture image, but remains vector at any export size.
    const renderZoom = Math.min(options.zoom + Math.log2(options.size / 1200), 20);
    const sourceZoom = Math.max(0, Math.min(MAX_SOURCE_ZOOM, Math.floor(renderZoom)));
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
    const detailClasses = new Set(['service', 'track', 'path']);
    const landuseClasses = new Set([
        'grass', 'park', 'forest', 'recreation_ground', 'meadow', 'garden', 'wood',
        'nature_reserve', 'cemetery', 'hospital', 'school', 'industrial', 'railway',
    ]);

    let waterD = '';
    let landuseD = '';
    let detailRoadD = '';
    let smallRoadD = '';
    let majorRoadD = '';

    const tasks: Promise<void>[] = [];
    for (let x = minTileX; x <= maxTileX; x++) {
        for (let y = minTileY; y <= maxTileY; y++) {
            tasks.push(fetchTile(sourceZoom, x, y).then(tile => {
                const water = tile.layers.water;
                if (water) {
                    for (let i = 0; i < water.length; i++) {
                        const feature = water.feature(i);
                        if (feature.type !== 3) continue;
                        waterD += geometryToPath(feature.loadGeometry(), wrapTileX(x, sourceZoom), y, sourceZoom, feature.extent, centerWorld, renderZoom, options.x, options.y, options.size, options.bearing, true);
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
            }).catch(() => undefined));
        }
    }

    await Promise.all(tasks);
    return {
        waterD,
        landuseD,
        detailRoadD,
        smallRoadD,
        majorRoadD,
        ...roadWidths(options.zoom),
    };
}
