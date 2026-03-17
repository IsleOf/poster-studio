export function getJulianDate(date: Date): number {
    return date.getTime() / 86400000 + 2440587.5;
}

export function getGMST(date: Date): number {
    const jd = getJulianDate(date);
    const d = jd - 2451545.0;
    // GMST in degrees
    return (280.46061837 + 360.98564736629 * d) % 360;
}

export function getLST(date: Date, longitude: number): number {
    const gmst = getGMST(date);
    let lst = (gmst + longitude) % 360;
    if (lst < 0) lst += 360;
    return lst;
}

export function getProjectionRotation(date: Date, lat: number, lng: number): [number, number, number] {
    const lst = getLST(date, lng);
    // Rotate by -LST (Right Ascension) and Latitude (Declination)
    // The standard d3.geo rotation is [yaw, pitch, roll]
    // For celestial maps, we typically rotate by [-LST, lat, 0]
    // However, d3-celestial often uses [-LST, -lat, 0] or similar depending on the coordinate system
    // We'll start with [-LST, lat] and adjust if needed
    return [-lst, lat, 0];
}
