export interface GeoResult {
    name: string;
    displayName: string;
    lat: number;
    lng: number;
    country: string;
    state?: string;
    /** Nominatim bounding box [minLat, maxLat, minLng, maxLng] */
    boundingbox?: [number, number, number, number];
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
/** Reverse-geocode a lat/lng to the nearest city name. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'PosterStudio/1.0' },
    });
    if (!res.ok) return null;
    const item = await res.json();
    if (!item?.address) return null;

    const name = item.address.city || item.address.town || item.address.village || item.name || '';
    return {
        name,
        displayName: item.display_name,
        lat,
        lng,
        country: item.address.country ?? '',
        state: item.address.state,
    };
}

export async function searchCities(query: string): Promise<GeoResult[]> {
    if (!query || query.length < 2) return [];

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '7');
    url.searchParams.set('addressdetails', '1');
    // No featuretype filter — allows cities, neighbourhoods, and street addresses.
    // Zoom level is inferred from the bounding box instead.

    const res = await fetch(url.toString(), {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'PosterStudio/1.0' },
    });

    if (!res.ok) throw new Error(`Nominatim ${res.status}`);

    const data: any[] = await res.json();

    return data.map((item) => {
        const bb: [number, number, number, number] | undefined = item.boundingbox
            ? [
                parseFloat(item.boundingbox[0]),
                parseFloat(item.boundingbox[1]),
                parseFloat(item.boundingbox[2]),
                parseFloat(item.boundingbox[3]),
              ]
            : undefined;
        return {
            name: item.name || item.display_name.split(',')[0],
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            country: item.address?.country ?? '',
            state: item.address?.state,
            boundingbox: bb,
        };
    });
}
