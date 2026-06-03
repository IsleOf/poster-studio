/**
 * Unit tests for parseCoordinateInput — the robust coordinate / map-URL detector
 * used so pasted coordinates place the pin directly, bypassing the geocoder.
 */
import { describe, it, expect } from 'vitest';
import { parseCoordinateInput } from './geocode';

const near = (a: number, b: number, eps = 1e-4) => Math.abs(a - b) < eps;

describe('parseCoordinateInput', () => {
    it('parses a plain decimal pair with comma', () => {
        const r = parseCoordinateInput('48.8566, 2.3522');
        expect(r).not.toBeNull();
        expect(near(r!.lat, 48.8566)).toBe(true);
        expect(near(r!.lng, 2.3522)).toBe(true);
    });

    it('parses a decimal pair separated by a space', () => {
        const r = parseCoordinateInput('40.7128 -74.0060');
        expect(r).not.toBeNull();
        expect(near(r!.lat, 40.7128)).toBe(true);
        expect(near(r!.lng, -74.006)).toBe(true);
    });

    it('parses negative latitude (southern hemisphere)', () => {
        const r = parseCoordinateInput('-33.8688, 151.2093'); // Sydney
        expect(near(r!.lat, -33.8688)).toBe(true);
        expect(near(r!.lng, 151.2093)).toBe(true);
    });

    it('parses a Google Maps @lat,lng URL', () => {
        const r = parseCoordinateInput('https://www.google.com/maps/@40.7484,-73.9857,15z');
        expect(near(r!.lat, 40.7484)).toBe(true);
        expect(near(r!.lng, -73.9857)).toBe(true);
    });

    it('parses a Google Maps place URL with !3d!4d', () => {
        const r = parseCoordinateInput('https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945,17z/data=!3d48.8583701!4d2.2944813');
        // !3d/!4d are the precise place coords and should win over @-coords
        expect(near(r!.lat, 48.8583701)).toBe(true);
        expect(near(r!.lng, 2.2944813)).toBe(true);
    });

    it('parses an Apple Maps ll= URL', () => {
        const r = parseCoordinateInput('https://maps.apple.com/?ll=37.7749,-122.4194&z=15');
        expect(near(r!.lat, 37.7749)).toBe(true);
        expect(near(r!.lng, -122.4194)).toBe(true);
    });

    it('parses a ?q=lat,lng URL', () => {
        const r = parseCoordinateInput('https://maps.google.com/?q=51.5074,-0.1278');
        expect(near(r!.lat, 51.5074)).toBe(true);
        expect(near(r!.lng, -0.1278)).toBe(true);
    });

    it('parses DMS coordinates', () => {
        const r = parseCoordinateInput(`40°44'54.3"N 73°59'08.7"W`);
        expect(r).not.toBeNull();
        expect(near(r!.lat, 40.7484, 1e-3)).toBe(true);
        expect(near(r!.lng, -73.9857, 1e-3)).toBe(true);
    });

    it('parses DMS with the lng component first (E/W resolves orientation)', () => {
        const r = parseCoordinateInput(`2°20'45"E 48°51'24"N`);
        expect(near(r!.lat, 48.8567, 1e-3)).toBe(true);
        expect(near(r!.lng, 2.3458, 1e-3)).toBe(true);
    });

    it('returns null for a plain place name', () => {
        expect(parseCoordinateInput('New York')).toBeNull();
        expect(parseCoordinateInput('The Plaza Hotel')).toBeNull();
    });

    it('returns null for out-of-range values', () => {
        expect(parseCoordinateInput('200, 400')).toBeNull(); // lat>90, lng>180
        expect(parseCoordinateInput('95.0, 10.0')).toBeNull(); // lat>90
    });

    it('returns null for empty / junk input', () => {
        expect(parseCoordinateInput('')).toBeNull();
        expect(parseCoordinateInput('   ')).toBeNull();
        expect(parseCoordinateInput('123')).toBeNull(); // single number, not a pair
    });
});
