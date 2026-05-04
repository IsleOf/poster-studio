// Apply a template settings object to the Zustand store
// Used by /t/:templateId route loading and SidebarControls template switcher

import { useStore } from '../store/useStore';

// All supported print sizes — maps size code string → store object
export const PRINT_SIZE_MAP: Record<string, { label: string; width: number; height: number; ratio: string }> = {
    '4x6':    { label: '4x6"',    width: 4,     height: 6,     ratio: '2/3' },
    '5x7':    { label: '5x7"',    width: 5,     height: 7,     ratio: '5/7' },
    '8x10':   { label: '8x10"',   width: 8,     height: 10,    ratio: '4/5' },
    '11x14':  { label: '11x14"',  width: 11,    height: 14,    ratio: '11/14' },
    '12x16':  { label: '12x16"',  width: 12,    height: 16,    ratio: '3/4' },
    '16x20':  { label: '16x20"',  width: 16,    height: 20,    ratio: '4/5' },
    '18x24':  { label: '18x24"',  width: 18,    height: 24,    ratio: '3/4' },
    '20x28':  { label: '20x28"',  width: 20,    height: 28,    ratio: '5/7' },
    '24x36':  { label: '24x36"',  width: 24,    height: 36,    ratio: '2/3' },
    '30x40':  { label: '30x40"',  width: 30,    height: 40,    ratio: '3/4' },
    '36x48':  { label: '36x48"',  width: 36,    height: 48,    ratio: '3/4' },
    'A5':     { label: 'A5',      width: 5.83,  height: 8.27,  ratio: '210/297' },
    'A4':     { label: 'A4',      width: 8.27,  height: 11.69, ratio: '210/297' },
    'A3':     { label: 'A3',      width: 11.69, height: 16.54, ratio: '210/297' },
    'A2':     { label: 'A2',      width: 16.54, height: 23.39, ratio: '210/297' },
    'A1':     { label: 'A1',      width: 23.39, height: 33.11, ratio: '210/297' },
    '30x40cm':{ label: '30×40cm', width: 11.81, height: 15.75, ratio: '3/4' },
    '40x50cm':{ label: '40×50cm', width: 15.75, height: 19.69, ratio: '4/5' },
    '50x70cm':{ label: '50×70cm', width: 19.69, height: 27.56, ratio: '5/7' },
    '60x90cm':{ label: '60×90cm', width: 23.62, height: 35.43, ratio: '2/3' },
};

export interface TemplateSettings {
    [key: string]: unknown;
}

// Default values for every template field — used to reset fields absent from older templates.
// Must stay in sync with useStore.ts initial state.
const TEMPLATE_FIELD_DEFAULTS: Record<string, unknown> = {
    posterType: 'starmap',
    posterColor: '#1B2735', textColor: '#ffffff', starColor: '#ffffff', mapInteriorColor: '#1B2735',
    starScale: 1, lineWeight: 1.5, gridWidth: 1, glowIntensity: 3, gridOpacity: 0.5,
    showBorder: true, showConstellations: true, showMilkyWay: false, showGrid: true,
    designStyle: 'standard', maskShape: 'circle', isLightMode: false, borderStyle: 'simple',
    showFrame: true, frameInset: 40, frameWidth: 5, shapeOutlineWidth: 1,
    titleFont: 'Playfair Display', subtitleFont: 'Lato', detailsFont: 'Lato',
    dedicationFont: 'Playfair Display', namesFont: 'Playfair Display',
    titleFontSize: 80, subtitleFontSize: 32, detailsFontSize: 24, dedicationFontSize: 24, namesFontSize: 48,
    titleOffsetX: 0, titleOffsetY: 0, subtitleOffsetY: 0, detailsOffsetY: 0,
    dedicationOffsetY: 0, namesOffsetY: 0, dividerOffsetY: 0, vertSepOffsetY: 0,
    showDivider: false, dividerLength: 90, dividerThickness: 0.5,
    showVertSep: true, vertSepHeight: 16, vertSepThickness: 0.8,
    showNames: false, titleAllCaps: false,
    circleSize: 1, heartSize: 1, houseSize: 1, shapeOffsetY: -60, shapeOffsetX: 0, snapEnabled: true,
    showInnerRing: false, innerRingWidth: 2, innerRingInset: 10,
    showOuterRing: false, outerRingWidth: 1.5, outerRingGap: 15,
    showHeartDecor: false, heartDecorOffsetY: 0,
    showLocationPin: true, locationPinSize: 70, locationPinOffsetX: 0, locationPinOffsetY: 0,
    mapStyleUrl: null, mapColorPreset: 'midnight', mapBgColor: '#1a1a2e', mapStreetColor: '#3d5a80',
    mapWaterColor: '#8f8f8f', mapLandColor: '#b6b6b6',
    mapMainRoadColor: '#111111', mapSmallRoadColor: '#1a1a1a', mapDetailRoadColor: '#2a2a2a',
    showLocation: true, showDate: true, showCoords: true,
    titleKerning: 0.05, subtitleKerning: 0.2, detailsKerning: 0.1, dedicationKerning: 0.05, namesKerning: 0.15,
    finelineWidth: 1.0,
    printSize: '8x10',
    title: '', subtitle: '', selectedTemplate: 'custom',
};

// Fields that should be applied from a template (whitelist)
const TEMPLATE_FIELDS = [
    'posterType', 'posterColor', 'textColor', 'starColor', 'mapInteriorColor',
    'starScale', 'lineWeight', 'gridWidth', 'glowIntensity', 'gridOpacity',
    'showBorder', 'showConstellations', 'showMilkyWay', 'showGrid',
    'designStyle', 'maskShape', 'isLightMode', 'borderStyle',
    'showFrame', 'frameInset', 'frameWidth', 'shapeOutlineWidth',
    'titleFont', 'subtitleFont', 'detailsFont', 'dedicationFont', 'namesFont',
    'titleFontSize', 'subtitleFontSize', 'detailsFontSize', 'dedicationFontSize', 'namesFontSize',
    'titleOffsetX', 'titleOffsetY', 'subtitleOffsetY', 'detailsOffsetY', 'dedicationOffsetY', 'namesOffsetY',
    'dividerOffsetY', 'vertSepOffsetY', 'showDivider', 'dividerLength', 'dividerThickness',
    'showVertSep', 'vertSepHeight', 'vertSepThickness',
    'showNames',
    'circleSize', 'heartSize', 'houseSize', 'shapeOffsetY', 'shapeOffsetX', 'snapEnabled',
    'showInnerRing', 'innerRingWidth', 'innerRingInset',
    'showOuterRing', 'outerRingWidth', 'outerRingGap',
    'showHeartDecor', 'heartDecorOffsetY',
    'showLocationPin', 'locationPinSize', 'locationPinOffsetX', 'locationPinOffsetY',
    'mapStyleUrl', 'mapColorPreset', 'mapBgColor', 'mapStreetColor',
    'mapWaterColor', 'mapLandColor', 'mapMainRoadColor', 'mapSmallRoadColor', 'mapDetailRoadColor',
    'showLocation', 'showDate', 'showCoords',
    'titleKerning', 'subtitleKerning', 'detailsKerning', 'dedicationKerning', 'namesKerning',
    'titleAllCaps',
    'finelineWidth', 'printSize',
    'title', 'subtitle', 'selectedTemplate',
] as const;

// Text-only fields — skip when switching sizes to preserve user's entered text
const TEXT_FIELDS = new Set(['title', 'subtitle', 'dedication', 'location', 'lat', 'lng']);

// Fields stored in template JSON that map to customText sub-fields
const CUSTOM_TEXT_KEYS = ['dedication', 'names'] as const;

export function applyTemplate(settings: TemplateSettings, { preserveText = false } = {}): void {
    const store = useStore.getState();
    const updates: Record<string, unknown> = {};

    for (const key of TEMPLATE_FIELDS) {
        if (preserveText && TEXT_FIELDS.has(key)) continue;
        // Use template value if present, else fall back to store default.
        // This prevents stale values from a previously-loaded template bleeding through
        // when loading an older template that was saved before a field existed.
        const rawValue = (key in settings && settings[key] !== undefined)
            ? settings[key]
            : TEMPLATE_FIELD_DEFAULTS[key];
        if (rawValue === undefined) continue;
        // printSize may be stored as a string code ("5x7") — resolve to full object
        if (key === 'printSize' && typeof rawValue === 'string') {
            const resolved = PRINT_SIZE_MAP[rawValue];
            if (resolved) updates[key] = resolved;
        } else {
            updates[key] = rawValue;
        }
    }

    // Map template's dedication/location into customText sub-object
    if (!preserveText) {
        const ctUpdates: Record<string, string> = {};
        for (const ctKey of CUSTOM_TEXT_KEYS) {
            if (ctKey in settings && settings[ctKey] !== undefined) {
                ctUpdates[ctKey] = settings[ctKey] as string;
            }
        }
        // Reset ALL customText fields so nothing carries over from a previous design
        ctUpdates.title = (settings.title as string) ?? '';
        ctUpdates.subtitle = (settings.subtitle as string) ?? '';
        ctUpdates.dedication = (settings.dedication as string) ?? '';
        ctUpdates.names = (settings.names as string) ?? '';
        ctUpdates.date = '';
        ctUpdates.location = '';
        ctUpdates.coords = '';
        updates.customText = { ...store.customText, ...ctUpdates };

        // Map default location to top-level location field
        if ('location' in settings && settings.location) {
            updates.location = settings.location;
        }
        // Map default lat/lng
        if ('lat' in settings) updates.lat = settings.lat;
        if ('lng' in settings) updates.lng = settings.lng;
    }

    // Apply posterType first if present (it triggers side effects in setPosterType)
    if (updates.posterType) {
        const pt = updates.posterType as 'starmap' | 'streetmap' | 'coloredmap';
        store.setPosterType(pt);
        delete updates.posterType;
        // Reset mapBackgroundImage when switching to starmap so old street map image doesn't persist
        if (pt === 'starmap') {
            updates.mapBackgroundImage = null;
        }
    }

    // Apply remaining fields directly via Zustand set
    if (Object.keys(updates).length > 0) {
        useStore.setState(updates);
    }
}

// Capture the current Zustand store state as a settings object suitable for saving to DB
export function captureCurrentSettings(): Record<string, unknown> {
    const state = useStore.getState() as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of TEMPLATE_FIELDS) {
        if (state[key] !== undefined) {
            // Convert printSize object back to string code for storage
            if (key === 'printSize' && typeof state[key] === 'object' && state[key] !== null) {
                const ps = state[key] as { label: string; width: number; height: number };
                const code = Object.entries(PRINT_SIZE_MAP).find(
                    ([, v]) => v.width === ps.width && v.height === ps.height
                );
                out[key] = code ? code[0] : state[key];
            } else {
                out[key] = state[key];
            }
        }
    }
    // Capture customText overrides as top-level fields (these are what the user last edited)
    const ct = (useStore.getState() as unknown as Record<string, unknown>).customText as Record<string, string> | undefined;
    if (ct?.title !== undefined) out.title = ct.title;       // prefer user-edited value
    if (ct?.subtitle !== undefined) out.subtitle = ct.subtitle;
    if (ct?.dedication) out.dedication = ct.dedication;
    if (ct?.names) out.names = ct.names;
    // Capture top-level location/lat/lng (customText.location overrides if non-empty)
    const s = useStore.getState();
    out.location = ct?.location || s.location;
    out.lat = s.lat;
    out.lng = s.lng;
    return out;
}

export async function fetchAndApplyTemplate(
    templateId: string,
    { preserveText = false, designGroupId }: { preserveText?: boolean; designGroupId?: string } = {}
): Promise<boolean> {
    try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const url = new URL(`${API_URL}/api/templates/${templateId}`, window.location.origin);
        // Bust browser disk caches so production always reflects the latest saved template.
        url.searchParams.set('ts', `${Date.now()}`);
        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok) return false;
        const data = await res.json();
        // Store the Etsy listing URL so DownloadButton can show the right CTA
        const { setSelectedTemplateEtsyUrl, setActiveDesignGroupId } = useStore.getState();
        setSelectedTemplateEtsyUrl(data.etsy_listing_url || null);
        if (designGroupId !== undefined) {
            setActiveDesignGroupId(designGroupId);
        }
        if (data.settings) {
            applyTemplate(data.settings, { preserveText });
            return true;
        }
        return false;
    } catch (err) {
        console.error('[Template] Failed to load template:', err);
        return false;
    }
}
