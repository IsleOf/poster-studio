/**
 * Tile Cache Service Worker
 *
 * Intercepts all requests to OpenFreeMap CDN and caches them on disk so that
 * repeated map loads, pan/zoom, and captureStitched tile jumps are served
 * instantly from the local cache rather than re-downloading from the network.
 *
 * Cache strategy:
 *   Vector tiles (.mvt / /planet/**):  cache-first (tiles are content-addressed)
 *   Style / TileJSON JSON:             stale-while-revalidate (update in background)
 *   Sprites / Glyphs:                  cache-first (static assets, versioned by URL)
 */

const TILE_CACHE   = 'maptiles-v1';
const STATIC_CACHE = 'mapstatic-v1';

const TILE_ORIGINS = ['tiles.openfreemap.org'];

function isTileOrigin(url) {
    return TILE_ORIGINS.some(o => url.includes(o));
}

// Vector tile paths look like /planet/14/8192/5461 or end in .mvt / .pbf
function isVectorTile(url) {
    return /\/planet\/\d+\/\d+\/\d+/.test(url) || /\.(mvt|pbf)(\?|$)/.test(url);
}

// Style JSON, TileJSON metadata
function isStyleOrMeta(url) {
    return /\/styles\/|\/planet(\?|$)|tilejson/.test(url);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;
    if (!isTileOrigin(request.url)) return;

    if (isVectorTile(request.url)) {
        // Cache-first: tiles are immutable once served
        event.respondWith(
            caches.open(TILE_CACHE).then(async cache => {
                const hit = await cache.match(request);
                if (hit) return hit;
                try {
                    const resp = await fetch(request);
                    if (resp.ok) cache.put(request, resp.clone());
                    return resp;
                } catch (err) {
                    return new Response('Tile unavailable', { status: 503 });
                }
            })
        );
        return;
    }

    if (isStyleOrMeta(request.url)) {
        // Stale-while-revalidate: serve cached immediately, refresh in background
        event.respondWith(
            caches.open(STATIC_CACHE).then(async cache => {
                const hit = await cache.match(request);
                const fetchPromise = fetch(request).then(resp => {
                    if (resp.ok) cache.put(request, resp.clone());
                    return resp;
                }).catch(() => null);
                return hit || fetchPromise;
            })
        );
        return;
    }

    // Sprites, glyphs, fonts — cache-first
    event.respondWith(
        caches.open(STATIC_CACHE).then(async cache => {
            const hit = await cache.match(request);
            if (hit) return hit;
            try {
                const resp = await fetch(request);
                if (resp.ok) cache.put(request, resp.clone());
                return resp;
            } catch {
                return new Response('Asset unavailable', { status: 503 });
            }
        })
    );
});
