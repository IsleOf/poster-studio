// Apply a template settings object to the Zustand store
// Used by /t/:templateId route loading and SidebarControls template switcher

import { useStore } from '../store/useStore';

export interface TemplateSettings {
    [key: string]: unknown;
}

// Fields that should be applied from a template (whitelist)
const TEMPLATE_FIELDS = [
    'posterType', 'posterColor', 'textColor', 'starColor', 'mapInteriorColor',
    'starScale', 'lineWeight', 'gridWidth', 'glowIntensity', 'gridOpacity',
    'showBorder', 'showConstellations', 'showMilkyWay', 'showGrid',
    'designStyle', 'maskShape', 'isLightMode', 'borderStyle',
    'showFrame', 'frameInset', 'frameWidth', 'shapeOutlineWidth',
    'titleFont', 'subtitleFont', 'detailsFont', 'dedicationFont',
    'titleFontSize', 'subtitleFontSize', 'detailsFontSize', 'dedicationFontSize',
    'titleOffsetY', 'subtitleOffsetY', 'detailsOffsetY', 'dedicationOffsetY',
    'dividerOffsetY', 'showDivider', 'dividerLength', 'dividerThickness',
    'circleSize', 'heartSize', 'houseSize', 'shapeOffsetY',
    'showLocationPin', 'locationPinSize',
    'mapStyleUrl', 'mapColorPreset', 'mapBgColor', 'mapStreetColor',
    'showLocation', 'showDate', 'showCoords',
    'titleKerning', 'subtitleKerning', 'detailsKerning', 'dedicationKerning',
    'finelineWidth', 'printSize',
] as const;

export function applyTemplate(settings: TemplateSettings): void {
    const store = useStore.getState();
    const updates: Record<string, unknown> = {};

    for (const key of TEMPLATE_FIELDS) {
        if (key in settings && settings[key] !== undefined) {
            updates[key] = settings[key];
        }
    }

    // Apply posterType first if present (it triggers side effects in setPosterType)
    if (updates.posterType) {
        store.setPosterType(updates.posterType as 'starmap' | 'streetmap' | 'coloredmap');
        delete updates.posterType;
    }

    // Apply remaining fields directly via Zustand set
    if (Object.keys(updates).length > 0) {
        useStore.setState(updates);
    }
}

export async function fetchAndApplyTemplate(templateId: string): Promise<boolean> {
    try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/templates/${templateId}`);
        if (!res.ok) return false;
        const data = await res.json();
        // Store the Etsy listing URL so DownloadButton can show the right CTA
        const { setSelectedTemplateEtsyUrl } = useStore.getState();
        setSelectedTemplateEtsyUrl(data.etsy_listing_url || null);
        if (data.settings) {
            applyTemplate(data.settings);
            return true;
        }
        return false;
    } catch (err) {
        console.error('[Template] Failed to load template:', err);
        return false;
    }
}
