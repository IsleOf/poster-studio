export interface GeoResult {
    name: string;
    displayName: string;
    lat: number;
    lng: number;
    country: string;
    state?: string;
    /** Bounding box [minLat, maxLat, minLng, maxLng] */
    boundingbox?: [number, number, number, number];
}

// Server proxy that selects the provider (Google when GOOGLE_MAPS_API_KEY is set,
// else Nominatim) and returns the normalised GeoResult shape.
const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Detect a coordinate or map-URL the user pasted into the search box, so we can place
 * the pin directly (bypassing the geocoder). Handles, in order:
 *   - Google/Apple/OSM map URLs (@lat,lng · !3d..!4d.. · q=/ll=/sll=/center= params)
 *   - DMS:  40°44'54"N 73°59'08"W   (comma or space separated, N/S/E/W in any order)
 *   - Decimal: "40.7128, -74.0060" or "40.7128 -74.0060"
 * Returns null when the input isn't a coordinate (so normal search proceeds).
 */
export function parseCoordinateInput(raw: string): { lat: number; lng: number } | null {
    if (!raw) return null;
    const s = raw.trim();
    const valid = (lat: number, lng: number) =>
        Number.isFinite(lat) && Number.isFinite(lng) &&
        Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;

    // 1) Map URLs — try the most specific patterns first.
    if (/https?:\/\//i.test(s) || /[?&](q|ll|sll|center|daddr|saddr)=/i.test(s)) {
        // Google place pages: !3d<lat>!4d<lng>
        let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
        if (m) { const r = valid(+m[1], +m[2]); if (r) return r; }
        // @lat,lng (Google /maps/@…)
        m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
        if (m) { const r = valid(+m[1], +m[2]); if (r) return r; }
        // ?q=lat,lng / ll= / sll= / center=
        m = s.match(/[?&](?:q|ll|sll|center)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
        if (m) { const r = valid(+m[1], +m[2]); if (r) return r; }
    }

    // 2) DMS — e.g. 40°44'54.3"N 73°59'08.7"W  (also accepts spaces for ° ' ")
    const dmsComp = /(\d{1,3})[°\s:]+(\d{1,2})['’\s:]+([\d.]+)["”\s]*\s*([NSEWnsew])/g;
    const comps: { val: number; dir: string }[] = [];
    let dm: RegExpExecArray | null;
    while ((dm = dmsComp.exec(s)) !== null) {
        const deg = +dm[1], min = +dm[2], sec = +dm[3];
        let val = deg + min / 60 + sec / 3600;
        const dir = dm[4].toUpperCase();
        if (dir === 'S' || dir === 'W') val = -val;
        comps.push({ val, dir });
    }
    if (comps.length === 2) {
        const lat = comps.find(c => c.dir === 'N' || c.dir === 'S')?.val;
        const lng = comps.find(c => c.dir === 'E' || c.dir === 'W')?.val;
        if (lat !== undefined && lng !== undefined) { const r = valid(lat, lng); if (r) return r; }
    }

    // 3) Plain decimal pair: "lat, lng" or "lat lng" (comma optional, trailing N/E ignored)
    const dec = s.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (dec) { const r = valid(+dec[1], +dec[2]); if (r) return r; }

    return null;
}

/**
 * Compute the MapLibre zoom level that fits a bounding box in a ~600 px viewport.
 * Clamps to [5, 16] — never wider than a sub-continent, never tighter than a block.
 */
export function zoomFromBbox(bb: [number, number, number, number]): number {
    const latSpan = bb[1] - bb[0];
    const lngSpan = bb[3] - bb[2];
    const maxSpan = Math.max(latSpan, lngSpan);
    if (maxSpan <= 0) return 12;
    // At zoom Z the world is 512×2^Z px wide (360°). Fit maxSpan in ~560 px.
    const z = Math.log2((560 / 512) * (360 / maxSpan));
    return Math.min(16, Math.max(5, Math.round(z * 10) / 10));
}

/**
 * Search for cities using the Nominatim public API (no key required).
 * Rate limit: 1 req/sec — always debounce calls.
 */
/** Direct Nominatim fallback — used only if the server proxy is unreachable. */
async function nominatimSearchDirect(query: string): Promise<GeoResult[]> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '7');
    url.searchParams.set('addressdetails', '1');
    const res = await fetch(url.toString(), {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'PosterStudio/1.0' },
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data: any[] = await res.json();
    return data.map((item) => ({
        name: item.name || item.display_name.split(',')[0],
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        country: item.address?.country ?? '',
        state: item.address?.state,
        boundingbox: item.boundingbox
            ? [parseFloat(item.boundingbox[0]), parseFloat(item.boundingbox[1]),
               parseFloat(item.boundingbox[2]), parseFloat(item.boundingbox[3])] as [number, number, number, number]
            : undefined,
    }));
}

/** Reverse-geocode a lat/lng to the nearest city name (via the server provider proxy). */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
    try {
        const url = new URL(`${API_URL}/api/geocode/reverse`, window.location.origin);
        url.searchParams.set('lat', String(lat));
        url.searchParams.set('lng', String(lng));
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`reverse ${res.status}`);
        const json = await res.json();
        return json.result ?? null;
    } catch {
        // Fallback: direct Nominatim reverse
        try {
            const url = new URL('https://nominatim.openstreetmap.org/reverse');
            url.searchParams.set('lat', String(lat));
            url.searchParams.set('lon', String(lng));
            url.searchParams.set('format', 'json');
            url.searchParams.set('addressdetails', '1');
            const res = await fetch(url.toString(), { headers: { 'Accept-Language': 'en' } });
            if (!res.ok) return null;
            const item = await res.json();
            if (!item?.address) return null;
            const name = item.address.city || item.address.town || item.address.village || item.name || '';
            return { name, displayName: item.display_name, lat, lng, country: item.address.country ?? '', state: item.address.state };
        } catch {
            return null;
        }
    }
}

/**
 * Search for places (cities, addresses, businesses) via the server geocoding proxy.
 * The proxy uses Google Places when configured, else Nominatim — same result shape either way.
 */
export async function searchCities(query: string): Promise<GeoResult[]> {
    if (!query || query.length < 2) return [];
    try {
        const url = new URL(`${API_URL}/api/geocode/search`, window.location.origin);
        url.searchParams.set('q', query);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`search ${res.status}`);
        const json = await res.json();
        return Array.isArray(json.results) ? json.results : [];
    } catch {
        // Resilience: if the proxy is unreachable, hit Nominatim directly.
        return nominatimSearchDirect(query);
    }
}
