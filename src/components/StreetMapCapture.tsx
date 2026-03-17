import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';

// ─── Color helpers ────────────────────────────────────────────────────────────

function adjustBrightness(hex: string, factor: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    const r = Math.min(255, Math.max(0, Math.round(parseInt(result[1], 16) * factor)));
    const g = Math.min(255, Math.max(0, Math.round(parseInt(result[2], 16) * factor)));
    const b = Math.min(255, Math.max(0, Math.round(parseInt(result[3], 16) * factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function createMapStyle(bgColor: string, streetColor: string): maplibregl.StyleSpecification {
    const waterColor = adjustBrightness(bgColor, 0.78);
    const buildingColor = adjustBrightness(bgColor, 1.18);

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
            { id: 'background', type: 'background', paint: { 'background-color': bgColor } },
            {
                id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water',
                paint: { 'fill-color': waterColor },
            },
            {
                id: 'landuse', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse',
                paint: { 'fill-color': adjustBrightness(bgColor, 1.05), 'fill-opacity': 0.5 },
            },
            {
                id: 'buildings', type: 'fill', source: 'openmaptiles', 'source-layer': 'building',
                paint: { 'fill-color': buildingColor, 'fill-opacity': 0.6 },
            },
            {
                id: 'roads_all', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
                minzoom: 6,
                paint: {
                    'line-color': streetColor,
                    'line-width': [
                        'interpolate', ['exponential', 1.5], ['zoom'],
                        6, ['match', ['get', 'class'], 'motorway', 1.5, 'trunk', 1.2, 'primary', 1, 0.5],
                        14, ['match', ['get', 'class'],
                            'motorway', 10, 'trunk', 8, 'primary', 7, 'secondary', 5,
                            'tertiary', 4, 'minor', 3, 'service', 2.5, 'residential', 3, 2,
                        ],
                        18, ['match', ['get', 'class'],
                            'motorway', 28, 'trunk', 24, 'primary', 20, 'secondary', 16,
                            'tertiary', 12, 'minor', 10, 'service', 8, 'residential', 10, 6,
                        ],
                    ] as maplibregl.ExpressionSpecification,
                },
            },
        ],
    };
}

// ─── Color presets (from map-poster-platform) ─────────────────────────────────

export const MAP_COLOR_PRESETS = [
    { id: 'midnight',  name: 'Midnight',   bgColor: '#1a1a2e', streetColor: '#3d5a80' },
    { id: 'classic',   name: 'Classic',    bgColor: '#f5f0e8', streetColor: '#8b7355' },
    { id: 'forest',    name: 'Forest',     bgColor: '#1a2e1a', streetColor: '#4a7c59' },
    { id: 'ocean',     name: 'Ocean',      bgColor: '#0d1b2a', streetColor: '#1b4f72' },
    { id: 'rose-gold', name: 'Rose Gold',  bgColor: '#2d1b1b', streetColor: '#c9956a' },
    { id: 'blueprint', name: 'Blueprint',  bgColor: '#0a192f', streetColor: '#64ffda' },
    { id: 'sepia',     name: 'Sepia',      bgColor: '#2c1810', streetColor: '#d4a96a' },
    { id: 'neon',      name: 'Neon',       bgColor: '#0d0d0d', streetColor: '#ff00ff' },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface StreetMapCaptureProps {
    /** Called with a data-URL of the rendered map canvas */
    onCapture: (dataUrl: string) => void;
}

const StreetMapCapture: React.FC<StreetMapCaptureProps> = ({ onCapture }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);

    const { mapCenterLat, mapCenterLng, mapZoom, mapBgColor, mapStreetColor } = useStore();

    const captureMap = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        // Wait for the map to finish rendering before capturing
        map.once('idle', () => {
            const canvas = map.getCanvas();
            const dataUrl = canvas.toDataURL('image/png');
            onCapture(dataUrl);
        });
        map.triggerRepaint();
    }, [onCapture]);

    // Initialize map once
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: createMapStyle(mapBgColor, mapStreetColor),
            center: [mapCenterLng, mapCenterLat],
            zoom: mapZoom,
            canvasContextAttributes: { preserveDrawingBuffer: true }, // Required for toDataURL
            interactive: true,
            attributionControl: false,
        });

        map.on('load', () => {
            mapRef.current = map;
            captureMap();
        });

        map.on('moveend', captureMap);
        map.on('zoomend', captureMap);

        return () => {
            map.off('moveend', captureMap);
            map.off('zoomend', captureMap);
            map.remove();
            mapRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update style when colors change
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;
        map.setStyle(createMapStyle(mapBgColor, mapStreetColor));
        map.once('idle', () => {
            const dataUrl = map.getCanvas().toDataURL('image/png');
            onCapture(dataUrl);
        });
    }, [mapBgColor, mapStreetColor, onCapture]);

    // Fly to new location
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
