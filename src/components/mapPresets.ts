// Shared map color preset data — no maplibre-gl import so it can be used
// in SidebarControls (sidebar UI) without pulling in the MapLibre bundle.
// StreetMapCapture imports this and re-exports MAP_COLOR_PRESETS with the
// full MapColorPreset type (including customStyle factory functions).

export type MapColorPresetBase = {
    id: string;
    name: string;
    bgColor: string;
    streetColor: string;
    /** Pre-built style URL (for realistic/OpenFreeMap modes) */
    styleUrl?: string;
};

export const MAP_COLOR_PRESET_DATA: MapColorPresetBase[] = [
    { id: 'midnight',  name: 'Midnight',           bgColor: '#1a1a2e', streetColor: '#3d5a80' },
    { id: 'classic',   name: 'Classic',             bgColor: '#f5f0e8', streetColor: '#8b7355' },
    { id: 'forest',    name: 'Forest',              bgColor: '#1a2e1a', streetColor: '#4a7c59' },
    { id: 'ocean',     name: 'Ocean',               bgColor: '#0d1b2a', streetColor: '#1b4f72' },
    { id: 'rose-gold', name: 'Rose Gold',           bgColor: '#2d1b1b', streetColor: '#c9956a' },
    { id: 'blueprint', name: 'Blueprint',           bgColor: '#0a192f', streetColor: '#64ffda' },
    { id: 'sepia',     name: 'Sepia',               bgColor: '#2c1810', streetColor: '#d4a96a' },
    { id: 'neon',      name: 'Neon',                bgColor: '#0d0d0d', streetColor: '#ff00ff' },
    { id: 'design2',   name: 'Rectangle (B&W)',     bgColor: '#ffffff', streetColor: '#111111' },
    {
        id: 'realistic',
        name: 'Realistic',
        bgColor: '#f8f4f0',
        streetColor: '#fc8',
        styleUrl: 'https://tiles.openfreemap.org/styles/bright',
    },
];
