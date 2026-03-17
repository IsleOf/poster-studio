export interface GeoResult {
    name: string;
    displayName: string;
    lat: number;
    lng: number;
    country: string;
    state?: string;
}

/**
 * Search for cities using the Nominatim public API (no key required).
 * Rate limit: 1 req/sec — always debounce calls.
 */
export async function searchCities(query: string): Promise<GeoResult[]> {
    if (!query || query.length < 2) return [];

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '7');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('featuretype', 'settlement');

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
    }));
}
